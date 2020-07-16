build:
	docker-compose build

zip:
	docker save trntxt_app | gzip > trntxt.tar.gz
