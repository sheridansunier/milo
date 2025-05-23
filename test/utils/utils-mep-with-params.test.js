import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import { getMepEnablement } from '../../libs/utils/utils.js';
import spoofParams from '../features/personalization/spoofParams.js';

describe('MEP Utils', () => {
  describe('getMepEnablement', async () => {
    it('checks param overwrites', async () => {
      document.head.innerHTML = await readFile({ path: './mocks/mep/head-promo.html' });
      spoofParams({ target: 'postlcp', promo: 'off', personalization: 'off', ajo: 'off', geoLocation: 'off' });
      setTimeout(() => {
        const persEnabled = getMepEnablement('personalization');
        const promoEnabled = getMepEnablement('manifestnames', 'promo');
        const ajoEnabled = getMepEnablement('ajo');
        const targetEnabled = getMepEnablement('target');
        const geoLocation = getMepEnablement('geoLocation');
        expect(promoEnabled).to.equal(false);
        expect(persEnabled).to.equal(false);
        expect(ajoEnabled).to.equal(false);
        expect(targetEnabled).to.equal('postlcp');
        expect(geoLocation).to.equal(false);
      }, 1000);
    });
  });
});
