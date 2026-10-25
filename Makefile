build:
	docker-compose build

.PHONY: copy
copy:
	test -f config/config.yaml || cp config/config.example.yaml config/config.yaml

zip:
	docker save trntxt_app | gzip > trntxt.tar.gz
