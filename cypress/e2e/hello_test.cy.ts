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

      // Check that JBrowse loaded successfully (look for the root div or main container)
      cy.get('#root', { timeout: 15000 }).should('exist')

      // Wait for JBrowse app to initialize - look for common JBrowse UI elements
      cy.get('div[class*="App"]', { timeout: 15000 }).should('exist')

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

      // Wait for JBrowse to load - use more reliable selectors
      cy.get('#root', { timeout: 15000 }).should('exist')

      // Wait for the app to fully initialize
      cy.get('div[class*="App"]', { timeout: 15000 }).should('exist')

      // Look for JBrowse menu elements or toolbar - these are more reliable indicators
      // that JBrowse has loaded successfully
      cy.get('button, [role="button"]', { timeout: 15000 }).should('exist')

      // Check if ImageGallery view elements exist
      cy.get('body').should('contain.text', 'ImageGallery')
    })
  })
})
