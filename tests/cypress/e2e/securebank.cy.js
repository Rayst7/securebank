/// <reference types="cypress" />

function login() {
  cy.env(['qaEmail', 'qaPassword']).then(({ qaEmail, qaPassword }) => {

    expect(qaEmail, 'Correo QA')
      .to.be.a('string').and.not.be.empty;

    expect(qaPassword, 'Contraseña QA')
      .to.be.a('string').and.not.be.empty;

    cy.visit('/login');

    cy.get('[data-testid="login-email"]')
      .type(qaEmail);

    cy.get('[data-testid="login-password"]')
      .type(qaPassword, { log: false });

    cy.get('[data-testid="login-submit"]')
      .click();

    cy.location('pathname')
      .should('eq', '/dashboard');
  });
}
describe('SecureBank — smoke y regresión web QA', () => {
  it('WEB-01: ruta privada exige autenticación', () => {
    cy.clearLocalStorage();
    cy.visit('/transferencias');
    cy.location('pathname').should('eq', '/login');
    cy.screenshot('WEB-01-ruta-protegida');
  });

  it('WEB-02: validación de formulario sin correo', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-password"]').type('ClaveTemporal123!', { log: false });
    cy.get('[data-testid="login-submit"]').click();
    cy.contains('Ingresa tu correo electrónico').should('be.visible');
    cy.screenshot('WEB-02-validacion-correo');
  });

  it('WEB-03: acceso y dashboard con usuario de QA', () => {
    login();
    cy.contains('Mis cuentas').should('be.visible');
    cy.screenshot('WEB-03-dashboard');
  });

  it('WEB-04: navegación de transferencias y pagos', () => {
    login();
    cy.contains('nav a', 'Transferencias').click();
    cy.location('pathname').should('eq', '/transferencias');
    cy.get('[data-testid="transfer-amount"]').should('exist');
    cy.screenshot('WEB-04-transferencias');
    cy.contains('nav a', 'Pagos').click();
    cy.location('pathname').should('eq', '/pagos');
    cy.get('[data-testid="payment-amount"]').should('exist');
    cy.screenshot('WEB-04-pagos');
  });

  it('WEB-05: cierre de sesión invalida navegación privada', () => {
    login();
    cy.contains('button', 'Cerrar sesión').click();
    cy.location('pathname').should('eq', '/login');
    cy.visit('/dashboard');
    cy.location('pathname').should('eq', '/login');
    cy.screenshot('WEB-05-logout');
  });
});

