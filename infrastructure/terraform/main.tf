locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  tags = {
    project     = var.project_name
    environment = var.environment
    managed_by  = "terraform"
  }
}

resource "azurerm_resource_group" "securebank" {
  name     = "rg-${local.resource_prefix}"
  location = var.location
  tags     = local.tags
}

resource "azurerm_virtual_network" "securebank" {
  name                = "vnet-${local.resource_prefix}"
  location            = azurerm_resource_group.securebank.location
  resource_group_name = azurerm_resource_group.securebank.name
  address_space       = [var.vnet_cidr]
  tags                = local.tags
}

resource "azurerm_subnet" "app" {
  name                 = "snet-app"
  resource_group_name  = azurerm_resource_group.securebank.name
  virtual_network_name = azurerm_virtual_network.securebank.name
  address_prefixes     = [var.subnet_cidr]
}

resource "azurerm_network_security_group" "app" {
  name                = "nsg-${local.resource_prefix}-app"
  location            = azurerm_resource_group.securebank.location
  resource_group_name = azurerm_resource_group.securebank.name
  tags                = local.tags

  security_rule {
    name                       = "Allow-HTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

}

# HTTP is only opened for QA while the reverse proxy is validated without TLS.
# Production exposes HTTPS exclusively; TLS termination must be configured
# before deploying a production environment.
resource "azurerm_network_security_rule" "http_qa" {
  count                       = var.environment == "qa" ? 1 : 0
  name                        = "Allow-HTTP-QA"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.securebank.name
  network_security_group_name = azurerm_network_security_group.app.name
}

resource "azurerm_network_security_rule" "ssh" {
  count                       = var.allowed_ssh_cidr == null ? 0 : 1
  name                        = "Allow-SSH-Admin"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.allowed_ssh_cidr
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.securebank.name
  network_security_group_name = azurerm_network_security_group.app.name
}

resource "azurerm_public_ip" "app" {
  name                = "pip-${local.resource_prefix}-app"
  location            = azurerm_resource_group.securebank.location
  resource_group_name = azurerm_resource_group.securebank.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.tags
}

resource "azurerm_network_interface" "app" {
  name                = "nic-${local.resource_prefix}-app"
  location            = azurerm_resource_group.securebank.location
  resource_group_name = azurerm_resource_group.securebank.name
  tags                = local.tags

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.app.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.app.id
  }
}

resource "azurerm_network_interface_security_group_association" "app" {
  network_interface_id      = azurerm_network_interface.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

resource "azurerm_linux_virtual_machine" "app" {
  name                            = "vm-${local.resource_prefix}-app"
  location                        = azurerm_resource_group.securebank.location
  resource_group_name             = azurerm_resource_group.securebank.name
  network_interface_ids           = [azurerm_network_interface.app.id]
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  custom_data                     = base64encode(file("${path.module}/cloud-init.yaml.tftpl"))
  tags                            = local.tags

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "StandardSSD_LRS"
    disk_size_gb         = 30
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }
}
