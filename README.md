# RevBid MVP

Open `index.html` in a current browser to run the self-contained car-auction bidding and profit calculator.

## Included

- Deal desk with validated vehicle, sale strategy, repair, auction, transport, and title cost inputs
- Live maximum-bid, investment, profit, and ROI calculation
- Saved-deal dashboard with edit flow and local-browser persistence
- Status pipeline: Watching, Bid, Won, Repairing, Ready for Sale, and Sold
- Responsive desktop/mobile layout and seeded mock data

## API integration boundary

All math is isolated in `calculate()` in `app.js`. VIN decoding, vehicle valuation, auction fee schedules, and freight estimates can be inserted as async API adapters that populate the existing form fields before calculation. No external API or credentials are needed for this MVP.
