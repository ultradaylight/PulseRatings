
/////////N//////////////////

npx hardhat run scripts/deploy.js --network hardhat

npx hardhat run scripts/deploy.js --network pulsechainTestnetV4

npx hardhat run scripts/testSigners.js --network pulsechainTestnetV4

node scripts/validateKey.js

npx hardhat run scripts/deploy_main.js --network pulsechain

/////FRONTEND/////
project-root/
├── index.html
├── app.js
├── contracts.json
├── navigation/
│   └── nav.js
├── pulseratings/
│   ├── feed.html
│   └── leaderboard.html
├── assets/
│   ├── favicon.ico
│   ├── gritstars.jpg
│   ├── thdn.jpg
│   ├── beach.jpg
│   ├── bop.png
├── src/
│   └── input.css
├── css/
│   └── output.css
├── package.json
├── tailwind.config.js
├── postcss.config.js



