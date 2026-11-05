output "resource_group_name" {
  value = azurerm_resource_group.securebank.name
}

output "public_ip_address" {
  value = azurerm_public_ip.app.ip_address
}

output "application_url" {
  description = "URL publica esperada. QA usa HTTP; produccion requiere TLS antes de exponerse."
  value       = var.environment == "qa" ? "http://${azurerm_public_ip.app.ip_address}" : "https://${azurerm_public_ip.app.ip_address}"
}

output "ssh_command" {
  description = "Comando SSH de administracion (requiere la clave privada local)."
  value       = "ssh ${var.admin_username}@${azurerm_public_ip.app.ip_address}"
}

output "vm_size" {
  value = azurerm_linux_virtual_machine.app.size
}

output "ansible_inventory_hint" {
  value = <<-EOT
    securebank-qa:
      ansible_host: ${azurerm_public_ip.app.ip_address}
      ansible_user: ${var.admin_username}
  EOT
}
