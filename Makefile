.PHONY: docker-build copy zip

docker-build:
	docker-compose build

copy:
	test -f config/config.yaml || cp config/config.example.yaml config/config.yaml

zip:
	docker save trntxt_app | gzip > trntxt.tar.gz
