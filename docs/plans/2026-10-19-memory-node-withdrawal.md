# Withdraw Memory Node from the public website

The maintainer requested withdrawing Memory Node from nei-pevc.com while reassessing the product direction.

Remove the homepage promotion and desktop/mobile navigation links. Replace the public `/memory` landing page and download promotion with a temporary redirect to `/`, without product-specific search or social metadata. A temporary redirect keeps a later reassessment reversible.

Preserve `/memory/setup`, activation APIs, account entitlements, release metadata, administrator tools, and existing privacy disclosures for installed clients. Point the setup page's return link to the homepage. No database, authentication, or client changes are required.

Verify schema, lint, types, the production build, and existing activation/setup tests. After deployment, check the homepage, desktop/mobile navigation, `/memory` redirect, and anonymous setup login redirect.
