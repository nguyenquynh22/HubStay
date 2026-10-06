# Backend API

## Run locally and expose it to phones

The API listens on port `5000` by default. To access it from a phone on any
network, keep this server and its ngrok tunnel running:

1. In one terminal, start the backend:

   ```powershell
   cd C:\Users\User\HubStay\backend-api
   npm install
   npm run dev
   ```

2. In a second terminal, start ngrok using the reserved domain assigned to your
   ngrok account:

   ```powershell
   cd C:\Users\User\HubStay\backend-api
   .\ngrok.exe http --domain=abacus-residence-festival.ngrok-free.dev 5000
   ```

   If ngrok is installed on `PATH` instead of beside this package, use
   `ngrok http --domain=abacus-residence-festival.ngrok-free.dev 5000`.
   The account must own that reserved domain. Authenticate ngrok on each
   computer with `ngrok config add-authtoken <YOUR_NGROK_TOKEN>`; never commit
   the token.

3. Set `EXPO_PUBLIC_API_URL` in `mobile-app/.env` to the HTTPS forwarding URL
   followed by `/api`, for example:

   ```env
   EXPO_PUBLIC_API_URL=https://abacus-residence-festival.ngrok-free.dev/api
   ```

   Restart Expo after changing this value. Verify the API at
   `https://abacus-residence-festival.ngrok-free.dev/api/health`.

The API root (`/`) returns a small status response; it does not serve the
HubStay website. The server and tunnel must remain running for remote devices
to use the API. For an Expo Go client opened from outside the local network,
Expo's Metro connection must also use Expo's own tunnel (`npx expo start
--tunnel`); this is separate from the backend ngrok tunnel.
