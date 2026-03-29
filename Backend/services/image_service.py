import hashlib
import ipaddress
import io
import json
import socket
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageOps, UnidentifiedImageError


IMAGE_CACHE_VERSION = "v1"


class ImageCacheError(Exception):
    pass


@dataclass(frozen=True)
class CachedImageAsset:
    path: Path
    mimetype: str
    etag: str
    last_modified: datetime
    cache_status: str


def _clamp_int(value, *, default: int, min_value: int, max_value: int) -> int:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default
    return max(min(parsed, max_value), min_value)


def _validate_source_url(source_url: str) -> str:
    parsed = urlparse(source_url.strip())

    if parsed.scheme not in {"http", "https"} or not parsed.netloc or not parsed.hostname:
        raise ImageCacheError("Only public http(s) image URLs are supported.")

    hostname = parsed.hostname.lower()
    if hostname == "localhost":
        raise ImageCacheError("Localhost image URLs are not allowed.")

    default_port = 443 if parsed.scheme == "https" else 80

    try:
        addresses = socket.getaddrinfo(hostname, parsed.port or default_port, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise ImageCacheError("Unable to resolve the image host.") from exc

    for _, _, _, _, sockaddr in addresses:
        address = ipaddress.ip_address(sockaddr[0])
        if (
            address.is_private
            or address.is_loopback
            or address.is_link_local
            or address.is_multicast
            or address.is_reserved
            or address.is_unspecified
        ):
            raise ImageCacheError("Private network image URLs are not allowed.")

    return parsed.geturl()


def _build_cache_paths(cache_dir: str, cache_key: str) -> tuple[Path, Path]:
    cache_root = Path(cache_dir)
    cache_root.mkdir(parents=True, exist_ok=True)
    return cache_root / f"{cache_key}.img", cache_root / f"{cache_key}.json"


def _build_cache_key(source_url: str, width: int, quality: int) -> str:
    payload = f"{IMAGE_CACHE_VERSION}|{source_url}|{width}|{quality}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _load_cached_asset(
    image_path: Path,
    metadata_path: Path,
    *,
    cache_ttl_seconds: int,
    require_fresh: bool,
) -> CachedImageAsset | None:
    if not image_path.exists() or not metadata_path.exists():
        return None

    try:
        metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
        cached_at = float(metadata.get("cached_at", image_path.stat().st_mtime))
        age = time.time() - cached_at
        if require_fresh and age > cache_ttl_seconds:
            return None

        return CachedImageAsset(
            path=image_path,
            mimetype=metadata["mimetype"],
            etag=metadata["etag"],
            last_modified=datetime.fromtimestamp(cached_at, tz=timezone.utc),
            cache_status="HIT" if require_fresh else "STALE",
        )
    except (KeyError, OSError, ValueError, TypeError, json.JSONDecodeError):
        return None


def _download_source_bytes(source_url: str, *, max_source_bytes: int) -> bytes:
    with requests.get(
        source_url,
        headers={
            "User-Agent": "BaconFinderImageProxy/1.0",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        },
        timeout=(5, 20),
        stream=True,
    ) as response:
        response.raise_for_status()

        content_type = response.headers.get("Content-Type", "").lower()
        if not content_type.startswith("image/"):
            raise ImageCacheError("The requested URL did not return an image.")

        chunks: list[bytes] = []
        total_bytes = 0
        for chunk in response.iter_content(chunk_size=64 * 1024):
            if not chunk:
                continue
            total_bytes += len(chunk)
            if total_bytes > max_source_bytes:
                raise ImageCacheError("The source image is too large to optimize.")
            chunks.append(chunk)

        return b"".join(chunks)


def _flatten_to_rgb(image: Image.Image) -> Image.Image:
    if image.mode == "RGB":
        return image

    if image.mode in {"RGBA", "LA"} or (image.mode == "P" and "transparency" in image.info):
        rgba_image = image.convert("RGBA")
        background = Image.new("RGB", rgba_image.size, (255, 255, 255))
        background.paste(rgba_image, mask=rgba_image.getchannel("A"))
        return background

    return image.convert("RGB")


def _optimize_image(source_bytes: bytes, *, width: int, quality: int) -> tuple[bytes, str]:
    try:
        with Image.open(io.BytesIO(source_bytes)) as raw_image:
            image = ImageOps.exif_transpose(raw_image)
            image = _flatten_to_rgb(image)

            target_width = min(width, image.width)
            if target_width < image.width:
                target_height = max(round(image.height * target_width / image.width), 1)
                image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

            output = io.BytesIO()
            try:
                image.save(output, format="WEBP", quality=quality, method=6)
                return output.getvalue(), "image/webp"
            except OSError:
                output = io.BytesIO()
                image.save(output, format="JPEG", quality=quality, optimize=True, progressive=True)
                return output.getvalue(), "image/jpeg"
    except (UnidentifiedImageError, OSError) as exc:
        raise ImageCacheError("Unable to decode and optimize the source image.") from exc


def _write_cached_asset(
    image_path: Path,
    metadata_path: Path,
    *,
    optimized_bytes: bytes,
    mimetype: str,
    etag: str,
) -> None:
    cached_at = time.time()
    metadata = {
        "mimetype": mimetype,
        "etag": etag,
        "cached_at": cached_at,
    }

    with tempfile.NamedTemporaryFile(dir=image_path.parent, delete=False) as image_tmp:
        image_tmp.write(optimized_bytes)
        image_tmp_path = Path(image_tmp.name)

    with tempfile.NamedTemporaryFile(
        dir=metadata_path.parent,
        delete=False,
        mode="w",
        encoding="utf-8",
    ) as metadata_tmp:
        json.dump(metadata, metadata_tmp)
        metadata_tmp_path = Path(metadata_tmp.name)

    image_tmp_path.replace(image_path)
    metadata_tmp_path.replace(metadata_path)


def get_cached_optimized_image(
    source_url: str,
    *,
    cache_dir: str,
    cache_ttl_seconds: int,
    default_width: int,
    max_width: int,
    default_quality: int,
    max_source_bytes: int,
    requested_width,
    requested_quality,
) -> CachedImageAsset:
    normalized_url = _validate_source_url(source_url)
    width = _clamp_int(requested_width, default=default_width, min_value=64, max_value=max_width)
    quality = _clamp_int(requested_quality, default=default_quality, min_value=45, max_value=90)

    cache_key = _build_cache_key(normalized_url, width, quality)
    image_path, metadata_path = _build_cache_paths(cache_dir, cache_key)

    fresh_asset = _load_cached_asset(
        image_path,
        metadata_path,
        cache_ttl_seconds=cache_ttl_seconds,
        require_fresh=True,
    )
    if fresh_asset:
        return fresh_asset

    stale_asset = _load_cached_asset(
        image_path,
        metadata_path,
        cache_ttl_seconds=cache_ttl_seconds,
        require_fresh=False,
    )

    try:
        source_bytes = _download_source_bytes(normalized_url, max_source_bytes=max_source_bytes)
        optimized_bytes, mimetype = _optimize_image(source_bytes, width=width, quality=quality)
        _write_cached_asset(
            image_path,
            metadata_path,
            optimized_bytes=optimized_bytes,
            mimetype=mimetype,
            etag=cache_key,
        )
        refreshed_asset = _load_cached_asset(
            image_path,
            metadata_path,
            cache_ttl_seconds=cache_ttl_seconds,
            require_fresh=True,
        )
        if refreshed_asset:
            return CachedImageAsset(
                path=refreshed_asset.path,
                mimetype=refreshed_asset.mimetype,
                etag=refreshed_asset.etag,
                last_modified=refreshed_asset.last_modified,
                cache_status="MISS" if stale_asset is None else "REFRESH",
            )
    except (ImageCacheError, requests.RequestException) as exc:
        if stale_asset:
            return stale_asset
        raise ImageCacheError(str(exc)) from exc

    raise ImageCacheError("Unable to cache the optimized image.")
