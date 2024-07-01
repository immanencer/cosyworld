#!/bin/bash

# Color codes for pretty output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Maximum length for CSR fields
MAX_LENGTH=64

# Function to prompt for input with a default value and length check
prompt_with_default() {
    local prompt="$1"
    local default="$2"
    local input
    while true; do
        read -p "${prompt} [${default}]: " input
        input=${input:-$default}
        if [ ${#input} -le $MAX_LENGTH ]; then
            echo "$input"
            return
        else
            echo -e "${RED}Input is too long. Please enter a value less than $MAX_LENGTH characters.${NC}"
        fi
    done
}

# Function to prompt for required input with length check
prompt_required() {
    local prompt="$1"
    local input
    while true; do
        read -p "${prompt}: " input
        if [ -n "$input" ] && [ ${#input} -le $MAX_LENGTH ]; then
            echo "$input"
            return
        elif [ -z "$input" ]; then
            echo -e "${RED}This field is required. Please enter a value.${NC}"
        else
            echo -e "${RED}Input is too long. Please enter a value less than $MAX_LENGTH characters.${NC}"
        fi
    done
}

# Function to check if the script is running on Windows (Git Bash)
is_windows() {
    [[ -n "$WINDIR" ]]
}

echo -e "${YELLOW}Please provide the following information for your SSL certificate:${NC}"
echo -e "${YELLOW}(Press Enter to accept the default value, if provided)${NC}"
echo

# Prompt for certificate details
DOMAIN=$(prompt_with_default "Domain name" "localhost")
COUNTRY=$(prompt_with_default "Country (2 letter code)" "US")
STATE=$(prompt_required "State/Province")
LOCALITY=$(prompt_required "City/Locality")
ORGANIZATION=$(prompt_required "Organization")
ORGANIZATIONAL_UNIT=$(prompt_with_default "Organizational Unit" "IT")
EMAIL=$(prompt_required "Email Address")

echo -e "${YELLOW}Creating directory for certificates...${NC}"
# Create directory for certificates
mkdir -p ssl_certificates

echo
echo -e "${YELLOW}Generating SSL Certificate for development purposes${NC}"
echo -e "${YELLOW}Warning: This certificate is self-signed and not suitable for production use${NC}"
echo

# Generate private key
echo -e "${GREEN}Generating private key...${NC}"
openssl genrsa -out ssl_certificates/privkey.pem 2048

# Check if the private key generation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to generate private key.${NC}"
    exit 1
fi

# Generate CSR (Certificate Signing Request)
echo -e "${GREEN}Generating Certificate Signing Request...${NC}"

subj="/C=$COUNTRY/ST=$STATE/L=$LOCALITY/O=$ORGANIZATION/OU=$ORGANIZATIONAL_UNIT/CN=$DOMAIN/emailAddress=$EMAIL"

# Escape special characters for Windows
if is_windows; then
    subj="${subj//\\/\\\\}"
    subj="${subj// /\\ }"
    subj="${subj//&/\\&}"
    subj="${subj//\"/\\\"}"
fi

openssl req -new -key ssl_certificates/privkey.pem -out ssl_certificates/csr.pem -subj "$subj"

# Check if the CSR generation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to generate CSR.${NC}"
    if is_windows; then
        echo -e "${YELLOW}Tip: If using Git Bash, try running this script in a standard Windows command prompt or PowerShell.${NC}"
    fi
    exit 1
fi

# Generate self-signed certificate
echo -e "${GREEN}Generating self-signed certificate...${NC}"
openssl x509 -req -days 365 -in ssl_certificates/csr.pem -signkey ssl_certificates/privkey.pem -out ssl_certificates/cert.pem

# Check if the certificate generation was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to generate self-signed certificate.${NC}"
    exit 1
fi

# Generate chain.pem (for self-signed, it's the same as cert.pem)
cp ssl_certificates/cert.pem ssl_certificates/chain.pem

echo
echo -e "${GREEN}Self-signed SSL certificate generated successfully!${NC}"
echo -e "Private Key: ${YELLOW}ssl_certificates/privkey.pem${NC}"
echo -e "Certificate: ${YELLOW}ssl_certificates/cert.pem${NC}"
echo -e "Chain: ${YELLOW}ssl_certificates/chain.pem${NC}"
echo
echo -e "${YELLOW}Warning: This is a self-signed certificate and will cause security warnings in browsers.${NC}"
echo -e "${YELLOW}For production use, please obtain a certificate from a trusted Certificate Authority.${NC}"
