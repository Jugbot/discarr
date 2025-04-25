# Discarr

### Discord bot for jellyseerr media updates.

![Screenshot 2025-04-03 211717](https://github.com/user-attachments/assets/0cac78fa-ac75-4902-ab41-9cfac37a0d45)

## Using the bot

1. [Register](https://discord.com/developers/applications?new_application=true) your own discord bot and obtain your token.
   <details><summary>You will also need to give the bot priviledges.</summary>
     <img src="https://github.com/user-attachments/assets/3145bfcd-8f6f-42d3-9da4-9c15de0263fc"/>
   </details>
2. [Copy](https://support.discord.com/hc/en-us/articles/206346498-Where-can-I-find-my-User-Server-Message-ID) the id of the server (also known as a guild) and text channel.
3. Use the provided `docker-compose.yml` with the required environment variables to host your bot using docker.

```yaml
services:
  discarr:
    container_name: discarr
    image: ghcr.io/jugbot/discarr:latest
    restart: unless-stopped
    volumes:
      - <your/data/dir>:/data
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
      - JELLYSEER_PUBLIC_URL= # fallback: JELLYSEER_URL
      - LOG_LEVEL= # default: info # options: error|warn|info|verbose|debug
      - CRON_SCHEDULE= # default: * * * * * (every minute)
```
