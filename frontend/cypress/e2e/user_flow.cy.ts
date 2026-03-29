/* eslint-disable @typescript-eslint/no-unused-vars */

Cypress.on('uncaught:exception', (err, runnable) => {
  return false; 
});

describe('BaconFinder User Journey', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/feed/foryou*', { fixture: 'foryou_feed.json' }).as('getForYou');
    cy.intercept('GET', '/api/rec/diverse*', { fixture: 'diverse_feed.json' }).as('getDiverse');
    cy.intercept('GET', '/api/search?*', { fixture: 'search_results.json' }).as('getSearch');
    
    cy.intercept('GET', '/api/search/1', {
      statusCode: 200,
      body: {
        id: "1",
        Name: "Creamy Mushroom Pasta",
        Images: "['https://images.test/pasta.jpg']",
        RecipeCategory: "Pasta",
        AggregatedRating: 4.8,
        Calories: 450,
        TotalTimeMins: 30,
        RecipeIngredientParts: "['pasta', 'mushroom', 'cream']",
        RecipeInstructions: "['Boil pasta', 'Cook mushroom']"
      }
    }).as('getRecipeDetail');

    cy.intercept('POST', '/api/auth/login', {
      statusCode: 200,
      body: { access_token: 'mock-token', user: { username: 'testuser' } }
    }).as('login');
    cy.intercept('GET', '/api/bookmarks/check/*', { statusCode: 200, body: { isBookmarked: false } }).as('checkBookmark');
    cy.intercept('GET', '/api/folders', { fixture: 'folders.json' }).as('getFolders');
  });

  it('ควรจะทำงานได้ครบ Loop: Login -> Explore -> Search -> View Detail -> Bookmark', () => {
    cy.visit('/login');
    
    cy.get('input', { timeout: 10000 }).first().should('be.visible').type('user');
    cy.get('input').eq(1).type('123');
    cy.get('button[type="submit"]').click();

    cy.url({ timeout: 10000 }).should('eq', Cypress.config().baseUrl + '/');

    cy.wait('@getForYou');
    cy.contains('Picked around your taste', { timeout: 10000 }).should('be.visible');
    
    cy.contains('button', 'Escape Bubble', { timeout: 5000 }).should('be.visible').click({ force: true });
    cy.wait('@getDiverse');
    cy.contains('Tired of the same old recipes?').should('be.visible');
    
    cy.contains('button', 'Reshuffle').click({ force: true });
    cy.wait('@getDiverse');

    cy.get('nav', { timeout: 10000 }).contains('Search').click();
    cy.url().should('include', '/search');

    cy.get('input', { timeout: 10000 })
      .filter('[placeholder*="Search"], [type="text"], .search-input')
      .first()
      .should('be.visible')
      .clear()
      .type('pasta{enter}');

    cy.get('.grid, [class*="card-container"]', { timeout: 10000 })
      .should('be.visible')
      .children()
      .should('have.length.at.least', 1);

    cy.get('.grid, [class*="card-container"]').children().first().click({ force: true });
    
    cy.wait('@getRecipeDetail');
    cy.contains('Calories', { timeout: 10000 }).should('be.visible');
    
    cy.contains('button', 'Save Recipe', { timeout: 10000 }).should('be.visible').click({ force: true });
    cy.wait('@getFolders');
    
    cy.intercept('POST', '/api/bookmarks', { statusCode: 201, body: { bookmark_id: 123 } }).as('saveBookmark');
    cy.contains('button', 'Save Bookmark', { timeout: 10000 }).click({ force: true });
    
    cy.get('body').click(10, 10, { force: true }); 
    cy.get('button').filter(':has(svg)').last().click({ force: true, multiple: true });
    
    cy.contains('button', 'Save Recipe', { timeout: 10000 }).should('not.exist');
  });
});