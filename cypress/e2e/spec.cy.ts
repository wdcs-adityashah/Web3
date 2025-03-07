describe("The Home Page", () => {
  beforeEach(() => {
    cy.visit("/");
  });
  it("successfully loads", () => {
    cy.get(".btn").click();
  });
  it("displays the connected account", () => {
    cy.get("p").contains("Connected Account:").should("exist");
  });
  it("displays the balance", () => {
    cy.get("p").contains("Balance:").should("exist");
  });
  it("displays the contract value", () => {
    cy.get("li").contains("Contract Value:").should("exist");
  });
  it("displays the contract Balance", () => {
    cy.get("li").contains("GetContractBalance:").should("exist");
  });
  it("displays the owner address", () => {
    cy.get("li").contains("OwnerAddress:").should("exist");
  });

  it("displays the user balance in the contract", () => {
    cy.get(".btn", { timeout: 10000 }).click();
    cy.get("li").contains("Balances:").should("exist");
  });

  it("allows disconnecting the wallet", () => {
    cy.get("button").contains("Disconnect Wallet").click();
  });

  it("allows switching to Sepolia Network", () => {
    cy.get("button").contains("Switch to Sepolia Network").click();
  });
});
