# Discarr

Discord bot for jellyseerr media updates.

```yaml
services:
  discarr:
    container_name: discarr
    image: ghcr.io/jugbot/discarr:latest
    ports:
      # All ports are optional
      - '3000:3000' # expose api
      - '5432:5432' # expose database
    environment:
      - DISCORD_TOKEN=
      - DISCORD_GUILD_ID=
      - DISCORD_CHANNEL_ID=
      - JELLYSEER_URL=
      - JELLYSEER_API_KEY=
    volumes:
      - /<host_folder_data>:/var/lib/postgresql/data
```
