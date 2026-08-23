# Exact source assets and crop provenance

These files are the immutable user-supplied sources for the selected Signal Rings deck. Runtime/PDF derivatives live under `../assets/` and `../assets/events/`.

| Source | SHA-256 | Selected use |
|---|---|---|
| `about-current-correct.jpg` | `91a95c431b30932bd0c724adff311f8323738f27313a3543f15f476e7417954f` | Page 2, How We've Grown |
| `about-future-building-large.png` | `338acee9a028a4b518a56da62edce2d1b08e0a7cf457a9a48c7ad30a67854737` | Page 2, Where We're Headed |
| `bitcoin-secure-wallet-2025-04-15.png` | `79e1e4865377467d1dbc22cf84d19b0b04fd1f03d3db0e255db3965f41eeccb7` | Apr 15, 2025 Secure Your Bitcoin Wallet |
| `bitcoin-node-2025-07-29.png` | `9e66389614f9898d4d43133002c92b78181e80a874b406975c927d8395c67fe1` | Jul 29, 2025 Run a Bitcoin Node |
| `bitcoin-lightning-node-2024-11-24.png` | `949d339224b0d232ee4ac8b6d85a48b2e3751f0ada3e5503d3fcf0a6deb91652` | Nov 24, 2024 Lightning Node workshop |
| `fsf-giving-guide-v10.png` | `6e83da2b422850f7c31172fb4e3d2333318b557c41d0b02570402461318c2e22` | Featured guest logo for the Free Software Foundation |

## Approved crops

### Current-space photo

- Output: `../assets/about-current-chair-crop.jpg`
- Output SHA-256: `8f2e83c4035c5aa28128aafa447e4e5846b139a6e6a439b006ec97d2e526025a`
- Source size: 1127×960
- Crop: full width; remove 69 px from top and 70 px from bottom
- Output size: 1127×821
- Rendered frame: 350×255 CSS px

### Future-building illustration

- Output: `../assets/about-future-building-full-height-crop.jpg`
- Output SHA-256: `3df8b2f9c2006c57abb9b294c4b6aec417d6760659c71c9c2bf6589b7b76a0b5`
- Source size: 1672×941
- Crop: full height; source x=407 through x=1311
- Output size: 904×941
- Rendered frame: 290×302 CSS px

## Event override rule

Map images by stable event URL/date, never title alone. Duplicate event titles exist. The PDF mappings are in `scripts/prepare-concept-assets.py`; website mappings are in `classes-events/events.json` in the website repository. A replacement is complete only when the archive card, dedicated event page metadata, responsive derivatives, PDF card, and live assets all agree.
