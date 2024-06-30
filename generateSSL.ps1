# PowerShell script for creating self-signed SSL certificates

# Set maximum length for CSR fields
$MaxLength = 64

# Function to prompt for input with a default value and length check
function Prompt-WithDefault {
    param(
        [string]$Prompt,
        [string]$Default
    )
    do {
        $Input = Read-Host "$Prompt [$Default]"
        if (-not $Input) {
            $Input = $Default
        }
        if ($Input.Length -le $MaxLength) {
            return $Input
        }
        Write-Host "Input is too long. Please enter a value less than $MaxLength characters." -ForegroundColor Red
    }
    while ($true)
}

# Function to prompt for required input with length check
function Prompt-Required {
    param(
        [string]$Prompt
    )
    do {
        $Input = Read-Host "$Prompt"
        if ($Input -and $Input.Length -le $MaxLength) {
            return $Input
        }
        elseif (-not $Input) {
            Write-Host "This field is required. Please enter a value." -ForegroundColor Red
        }
        else {
            Write-Host "Input is too long. Please enter a value less than $MaxLength characters." -ForegroundColor Red
        }
    }
    while ($true)
}

# Collect certificate information
Write-Host "Please provide the following information for your SSL certificate:" -ForegroundColor Yellow
$Domain = Prompt-WithDefault "Domain name" "localhost"
$Country = Prompt-WithDefault "Country (2 letter code)" "US"
$State = Prompt-Required "State/Province"
$Locality = Prompt-Required "City/Locality"
$Organization = Prompt-Required "Organization"
$OrganizationalUnit = Prompt-WithDefault "Organizational Unit" "IT"
$Email = Prompt-Required "Email Address"

# Create directory for certificates
$CertificatePath = "ssl_certificates"
if (-not (Test-Path $CertificatePath)) {
    New-Item -Path $CertificatePath -ItemType Directory | Out-Null
}

Write-Host "Generating SSL Certificate for development purposes" -ForegroundColor Yellow
Write-Host "Warning: This certificate is self-signed and not suitable for production use" -ForegroundColor Yellow

# Generate private key
$PrivateKeyPath = "$CertificatePath\privkey.pem"
Write-Host "Generating private key..." -ForegroundColor Green
openssl genrsa -out $PrivateKeyPath 2048

# Generate CSR
$CSRPath = "$CertificatePath\csr.pem"
$Subject = "/C=$Country/ST=$State/L=$Locality/O=$Organization/OU=$OrganizationalUnit/CN=$Domain/emailAddress=$Email"
Write-Host "Generating Certificate Signing Request..." -ForegroundColor Green
openssl req -new -key $PrivateKeyPath -out $CSRPath -subj $Subject

# Generate self-signed certificate
$CertPath = "$CertificatePath\cert.pem"
Write-Host "Generating self-signed certificate..." -ForegroundColor Green
openssl x509 -req -days 365 -in $CSRPath -signkey $PrivateKeyPath -out $CertPath

# Copy cert.pem to chain.pem (for self-signed, it's the same as cert.pem)
Copy-Item -Path $CertPath -Destination "$CertificatePath\chain.pem"

Write-Host "Self-signed SSL certificate generated successfully!" -ForegroundColor Green
Write-Host "Private Key: $PrivateKeyPath" -ForegroundColor Yellow
Write-Host "Certificate: $CertPath" -ForegroundColor Yellow
Write-Host "Chain: $CertificatePath\chain.pem" -ForegroundColor Yellow
Write-Host "Warning: This is a self-signed certificate and will cause security warnings in browsers." -ForegroundColor Yellow
Write-Host "For production use, please obtain a certificate from a trusted Certificate Authority." -ForegroundColor Yellow
