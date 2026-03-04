SHELL := /bin/sh

.PHONY: help install dev build start lint typecheck migrate

help:
	@echo "Available targets:"
	@echo "  make install    Install dependencies"
	@echo "  make dev        Run Next.js dev server"
	@echo "  make build      Build app"
	@echo "  make start      Start production server"
	@echo "  make lint       Run lint"
	@echo "  make typecheck  Run TypeScript typecheck"
	@echo "  make migrate    Run ShiftSnap DB migrations"

install:
	npm install

dev:
	npm run dev

build:
	npm run build

start:
	npm run start

lint:
	npm run lint

typecheck:
	npm run typecheck

migrate:
	npm run db:migrate
