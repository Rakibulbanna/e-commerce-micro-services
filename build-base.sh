#!/bin/bash

# Build base image
docker build -t e-commerce-base -f Dockerfile.base .

# Tag the image
docker tag e-commerce-base localhost:5000/e-commerce-base

# Push to local registry
docker push localhost:5000/e-commerce-base 