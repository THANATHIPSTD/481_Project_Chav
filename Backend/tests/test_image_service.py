import io
import json
import tempfile
import time
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from Backend.tests.helpers import import_fresh


image_service = import_fresh("Backend.services.image_service")


def _make_png_bytes(*, width=240, height=120, color=(220, 30, 30, 255)) -> bytes:
    image = Image.new("RGBA", (width, height), color)
    output = io.BytesIO()
    image.save(output, format="PNG")
    return output.getvalue()


class ImageServiceUnitTests(unittest.TestCase):
    def test_clamp_int_uses_default_and_bounds(self):
        self.assertEqual(
            image_service._clamp_int("42", default=100, min_value=10, max_value=80),
            42,
        )
        self.assertEqual(
            image_service._clamp_int("not-a-number", default=100, min_value=10, max_value=80),
            80,
        )
        self.assertEqual(
            image_service._clamp_int("5", default=100, min_value=10, max_value=80),
            10,
        )

    def test_validate_source_url_accepts_public_http_url(self):
        fake_addresses = [
            (0, 0, 0, "", ("8.8.8.8", 443)),
            (0, 0, 0, "", ("2001:4860:4860::8888", 443)),
        ]

        with patch.object(image_service.socket, "getaddrinfo", return_value=fake_addresses):
            result = image_service._validate_source_url("https://example.com/photo.jpg")

        self.assertEqual(result, "https://example.com/photo.jpg")

    def test_validate_source_url_rejects_private_hosts(self):
        fake_addresses = [(0, 0, 0, "", ("127.0.0.1", 443))]

        with patch.object(image_service.socket, "getaddrinfo", return_value=fake_addresses):
            with self.assertRaisesRegex(image_service.ImageCacheError, "Private network"):
                image_service._validate_source_url("https://example.com/photo.jpg")

    def test_load_cached_asset_returns_hit_when_entry_is_fresh(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image_path = Path(temp_dir) / "cached.img"
            metadata_path = Path(temp_dir) / "cached.json"

            image_path.write_bytes(b"optimized-image")
            metadata_path.write_text(
                json.dumps(
                    {
                        "mimetype": "image/webp",
                        "etag": "abc123",
                        "cached_at": time.time(),
                    }
                ),
                encoding="utf-8",
            )

            asset = image_service._load_cached_asset(
                image_path,
                metadata_path,
                cache_ttl_seconds=300,
                require_fresh=True,
            )

        self.assertIsNotNone(asset)
        self.assertEqual(asset.mimetype, "image/webp")
        self.assertEqual(asset.etag, "abc123")
        self.assertEqual(asset.cache_status, "HIT")

    def test_load_cached_asset_returns_none_when_entry_is_expired_and_must_be_fresh(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            image_path = Path(temp_dir) / "cached.img"
            metadata_path = Path(temp_dir) / "cached.json"

            image_path.write_bytes(b"optimized-image")
            metadata_path.write_text(
                json.dumps(
                    {
                        "mimetype": "image/webp",
                        "etag": "abc123",
                        "cached_at": time.time() - 600,
                    }
                ),
                encoding="utf-8",
            )

            asset = image_service._load_cached_asset(
                image_path,
                metadata_path,
                cache_ttl_seconds=60,
                require_fresh=True,
            )

        self.assertIsNone(asset)

    def test_optimize_image_resizes_to_requested_width(self):
        optimized_bytes, mimetype = image_service._optimize_image(
            _make_png_bytes(width=240, height=120),
            width=120,
            quality=80,
        )

        self.assertIn(mimetype, {"image/webp", "image/jpeg"})
        self.assertGreater(len(optimized_bytes), 0)

        with Image.open(io.BytesIO(optimized_bytes)) as optimized_image:
            self.assertEqual(optimized_image.width, 120)
            self.assertEqual(optimized_image.height, 60)

    def test_get_cached_optimized_image_returns_miss_then_hit(self):
        source_url = "https://images.example.com/meal.png"
        source_bytes = _make_png_bytes()

        with tempfile.TemporaryDirectory() as temp_dir:
            with patch.object(image_service, "_validate_source_url", return_value=source_url):
                with patch.object(image_service, "_download_source_bytes", return_value=source_bytes):
                    first_asset = image_service.get_cached_optimized_image(
                        source_url,
                        cache_dir=temp_dir,
                        cache_ttl_seconds=300,
                        default_width=160,
                        max_width=320,
                        default_quality=80,
                        max_source_bytes=1024 * 1024,
                        requested_width=120,
                        requested_quality=75,
                    )
                    second_asset = image_service.get_cached_optimized_image(
                        source_url,
                        cache_dir=temp_dir,
                        cache_ttl_seconds=300,
                        default_width=160,
                        max_width=320,
                        default_quality=80,
                        max_source_bytes=1024 * 1024,
                        requested_width=120,
                        requested_quality=75,
                    )
                    self.assertTrue(first_asset.path.exists())
                    self.assertTrue(second_asset.path.exists())

        self.assertEqual(first_asset.cache_status, "MISS")
        self.assertEqual(second_asset.cache_status, "HIT")
        self.assertEqual(first_asset.etag, second_asset.etag)

    def test_get_cached_optimized_image_returns_stale_asset_when_refresh_fails(self):
        source_url = "https://images.example.com/meal.png"
        source_bytes = _make_png_bytes()

        with tempfile.TemporaryDirectory() as temp_dir:
            cache_key = image_service._build_cache_key(source_url, 120, 75)
            image_path, metadata_path = image_service._build_cache_paths(temp_dir, cache_key)
            optimized_bytes, mimetype = image_service._optimize_image(
                source_bytes,
                width=120,
                quality=75,
            )
            image_service._write_cached_asset(
                image_path,
                metadata_path,
                optimized_bytes=optimized_bytes,
                mimetype=mimetype,
                etag=cache_key,
            )

            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            metadata["cached_at"] = time.time() - 3600
            metadata_path.write_text(json.dumps(metadata), encoding="utf-8")

            with patch.object(image_service, "_validate_source_url", return_value=source_url):
                with patch.object(
                    image_service,
                    "_download_source_bytes",
                    side_effect=image_service.ImageCacheError("boom"),
                ):
                    asset = image_service.get_cached_optimized_image(
                        source_url,
                        cache_dir=temp_dir,
                        cache_ttl_seconds=60,
                        default_width=160,
                        max_width=320,
                        default_quality=80,
                        max_source_bytes=1024 * 1024,
                        requested_width=120,
                        requested_quality=75,
                    )

        self.assertEqual(asset.cache_status, "STALE")
        self.assertEqual(asset.path, image_path)


if __name__ == "__main__":
    unittest.main()
