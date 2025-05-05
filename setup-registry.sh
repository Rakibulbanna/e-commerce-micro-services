#!/bin/bash

# Create a directory for registry data
mkdir -p registry-data

# Start the registry container
docker run -d \
  -p 5000:5000 \
  --restart=always \
  --name registry \
  -v "$(pwd)/registry-data:/var/lib/registry" \
  registry:2

echo "Local Docker registry is running at localhost:5000" 