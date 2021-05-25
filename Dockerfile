variables:
  # enable docker buildkit. Used with `BUILDKIT_INLINE_CACHE=1` below
  DOCKER_BUILDKIT: 1
  DOCKER_TLS_CERTDIR: "/certs"
  IMAGE_TEST: $CI_REGISTRY_IMAGE/test:latest
  IMAGE_CYPRESS: $CI_REGISTRY_IMAGE/cypress:latest
  IMAGE_DEPLOY: $CI_REGISTRY_IMAGE/deploy:latest
 
stages:
  - build
  - misc
  - deploy
  
.base:
  image: docker:latest
  services:
    - docker:dind
  before_script:
    - docker --version
    - docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"
