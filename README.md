# Discarr

Discord bot for jellyseerr media updates.

```yaml
services:
  discarr:
    container_name: discarr
    image: ghcr.io/jugbot/discarr:latest
    restart: unless-stopped
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      # All ports are optional
      - '3000:3000' # api
      - '5432:5432' # database
    environment:
      - DISCORD_TOKEN=
      - DISCORD_GUILD_ID=
      - DISCORD_CHANNEL_ID=
      - JELLYSEER_API_KEY=
      - JELLYSEER_URL=
      - JELLYSEER_PUBLIC_URL= # optional
      - LOG_LEVEL=info # optional
volumes:
  postgres-data:
```
