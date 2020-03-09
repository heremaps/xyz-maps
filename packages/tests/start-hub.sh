#!/bin/bash

set -e

if [[ $1 == 'kill' && $2 == 'true' ]]; then

	docker kill $(docker ps -q)
    docker rm $(docker ps -a -q)

else

    echo "start services in docker"
    docker-compose up -d 

    echo "wait for services to be ready"

    echo "wait for XYZHub to be ready"
    curl https://s3-eu-west-1.amazonaws.com/mapwikidev/cloud-init/shell/bamboo/waitForService.sh | bash -s localhost:8181
    
    
fi


