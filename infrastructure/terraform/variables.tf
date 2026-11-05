variable "project_name" {
  description = "Nombre corto usado para identificar recursos."
  type        = string
  default     = "securebank"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}$", var.project_name))
    error_message = "project_name debe iniciar con letra y contener solo minusculas, numeros o guiones (2-21 caracteres)."
  }
}

variable "environment" {
  description = "Entorno de despliegue."
  type        = string
  default     = "qa"

  validation {
    condition     = contains(["qa", "prod"], var.environment)
    error_message = "environment debe ser qa o prod."
  }
}

variable "location" {
  description = "Región de Azure."
  type        = string
  default     = "eastus"
}

variable "admin_username" {
  description = "Usuario administrativo Linux para Ansible y operaciones SSH."
  type        = string
  default     = "securebankadmin"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,31}$", var.admin_username))
    error_message = "admin_username debe cumplir las reglas de Azure: minusculas, numeros o guiones, iniciando con letra."
  }
}

variable "ssh_public_key" {
  description = "Clave pública SSH para la máquina virtual. Nunca almacenar la clave privada en Terraform."
  type        = string
  sensitive   = true

  validation {
    condition     = can(regex("^(ssh-(rsa|ed25519)|ecdsa-sha2-nistp(256|384|521))\\s+", trimspace(var.ssh_public_key)))
    error_message = "ssh_public_key debe ser una clave publica OpenSSH valida (ssh-ed25519, ssh-rsa o ecdsa)."
  }
}

variable "allowed_ssh_cidr" {
  description = "CIDR público autorizado para SSH. Si es null, SSH no se abre en el NSG."
  type        = string
  default     = null
  nullable    = true

  validation {
    condition     = var.allowed_ssh_cidr == null || (can(cidrhost(var.allowed_ssh_cidr, 0)) && var.allowed_ssh_cidr != "0.0.0.0/0")
    error_message = "allowed_ssh_cidr debe ser un CIDR valido y no puede ser 0.0.0.0/0."
  }
}

variable "vm_size" {
  description = "SKU de VM para el entorno QA."
  type        = string
  default     = "Standard_B2s"
}

variable "vnet_cidr" {
  description = "CIDR de la red virtual."
  type        = string
  default     = "10.20.0.0/16"

  validation {
    condition     = can(cidrhost(var.vnet_cidr, 0))
    error_message = "vnet_cidr debe ser un CIDR valido."
  }
}

variable "subnet_cidr" {
  description = "CIDR de la subred de aplicación."
  type        = string
  default     = "10.20.10.0/24"

  validation {
    condition     = can(cidrhost(var.subnet_cidr, 0))
    error_message = "subnet_cidr debe ser un CIDR valido."
  }
}
