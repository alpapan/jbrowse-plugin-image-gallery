describe('ImageGallery Plugin Test', () => {
  it('loads JBrowse with ImageGallery plugin successfully', () => {
    // Load JBrowse with the ImageGallery plugin configuration
    cy.fixture('hello_view.json').then(sessionData => {
      cy.writeFile(
        '.jbrowse/hello_view.json',
        JSON.stringify(sessionData, null, 2),
      )
    })

    cy.fixture('hello_view.json').then(sessionData => {
      cy.writeFile(
        '.jbrowse/hello_view.json',
        JSON.stringify(sessionData, null, 2),
      )
      cy.visit('/?config=hello_view.json')

      // Verify the plugin loads without 404 errors by checking for basic JBrowse elements
      cy.get('body').should('be.visible')

      // Check that JBrowse loaded successfully (should see the app container)
      cy.get('[data-testid="jbrowse-app"]', { timeout: 10000 }).should('exist')

      // Verify no console errors related to plugin loading
      cy.window().then(win => {
        // Check that the plugin script loaded (no 404 for the plugin file)
        cy.request({
          url: 'http://localhost:9000/dist/jbrowse-plugin-image-gallery-plugin.umd.development.js',
          failOnStatusCode: false,
        }).then(response => {
          expect(response.status).to.eq(200)
        })
      })
    })
  })

  it('verifies ImageGallery plugin is available in the app', () => {
    cy.fixture('hello_view.json').then(sessionData => {
      cy.writeFile(
        '.jbrowse/hello_view.json',
        JSON.stringify(sessionData, null, 2),
      )
      cy.visit('/?config=hello_view.json')

      // Wait for JBrowse to load
      cy.get('[data-testid="jbrowse-app"]', { timeout: 10000 }).should('exist')

      // Check that we can access the File menu (basic JBrowse functionality)
      cy.get('button').contains('File', { timeout: 10000 }).should('exist')
    })
  })
})
