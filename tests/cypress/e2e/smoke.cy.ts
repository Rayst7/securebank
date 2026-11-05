describe('SecureBank web smoke', () => {
  it('renders the login page and its main controls', () => {
    cy.visit('/login')

    cy.contains('Bienvenido de nuevo').should('be.visible')
    cy.contains('Accede con tu cuenta de SecureBank').should('be.visible')

    cy.get('[data-testid="login-email"]').should('be.visible').and('have.attr', 'type', 'email')
    cy.get('[data-testid="login-password"]').should('be.visible').and('have.attr', 'type', 'password')
    cy.get('[data-testid="login-submit"]').should('be.visible').and('contain', 'Ingresar')
  })

  it('redirects an unauthenticated user from the dashboard to login', () => {
    cy.visit('/dashboard')
    cy.location('pathname').should('eq', '/login')
  })
})
