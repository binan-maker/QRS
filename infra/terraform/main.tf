# BinRo — Terraform root module
# Phase 6: implement resource modules here.
# See infra/README.md for the full plan.

terraform {
  required_version = ">= 1.6"

  # Phase 6: configure remote state backend (Terraform Cloud or S3)
  # backend "s3" {
  #   bucket = "binro-terraform-state"
  #   key    = "production/terraform.tfstate"
  #   region = "ap-south-1"
  # }
}

# Placeholder — resource modules added in Phase 6.
