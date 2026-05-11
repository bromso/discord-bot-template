FROM oven/bun:1-debian

RUN apt-get update && apt-get install -y --no-install-recommends \
      git \
      curl \
      wget \
      ca-certificates \
      postgresql-client \
    && rm -rf /var/lib/apt/lists/*

USER bun
WORKDIR /workspaces/discord-bot-template
