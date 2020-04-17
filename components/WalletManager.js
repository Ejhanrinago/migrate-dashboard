import React, { useCallback, useMemo } from 'react';
import useMaker from '../hooks/useMaker';
import IconButton from '../components/IconButton';
import { Grid } from '@makerdao/ui-components-core';
import BrowserProviderButton from '../components/BrowserProviderButton';
import Trezor from '../assets/icons/trezor.svg';
import Ledger from '../assets/icons/ledger.svg';
import walletConnect from '../assets/icons/walletConnect.svg';
import walletLink from '../assets/icons/wallet-link.svg';
import { BrowserView } from 'react-device-detect';

import Router from 'next/router';
import lang from '../languages';
import { connectBrowserProvider } from '../maker';
import useStore from '../hooks/useStore';
import { LedgerModal, TrezorModal } from './wallets/HardwareModals';

function WalletManager({ providerName }) {
  const [, dispatch] = useStore();
  const { maker } = useMaker();

  const onAccountChosen = useCallback(
    async ({ address }, type) => {
      dispatch({
        type: 'assign',
        payload: {
          accountType: type
        }
      });
      maker.useAccountWithAddress(address);
      Router.push('/overview');
    },
    [dispatch, maker]
  );

  const connectToProviderOfType = async type => {
    const account = await maker.addAccount({
      type
    });
    maker.useAccountWithAddress(account.address);
    Router.push('/overview');
  };

  async function connectBrowserWallet() {
    try {
      const connectedAddress = await connectBrowserProvider(maker);
      onAccountChosen({ address: connectedAddress }, providerName);
    } catch (err) {
      window.alert(err);
    }
  }

  const [showLedger, setShowLedger] = React.useState(false);
  const [showTrezor, setShowTrezor] = React.useState(false);

  return (
    <Grid px="m" py="xs" gridRowGap="s" justifyContent={['center', 'center']}>
      <BrowserProviderButton
        onClick={connectBrowserWallet}
        disabled={!maker}
        provider={providerName}
      />
      <BrowserView>
        <IconButton
          onClick={() => setShowTrezor(true)}
          disabled={!maker}
          icon={
            <img
              src={Trezor}
              css={{ marginTop: -5, marginBottom: -5, paddingLeft: 5 }}
            />
          }
        >
          {lang.providers.trezor}
        </IconButton>
        {useMemo(
          () => (
            <TrezorModal
              show={showTrezor}
              onClose={() => setShowTrezor(false)}
              onAccountChosen={onAccountChosen}
            />
          ),
          [onAccountChosen, showTrezor]
        )}
      </BrowserView>

      <BrowserView>
        <IconButton
          onClick={() => setShowLedger(true)}
          disabled={!maker}
          icon={
            <img
              src={Ledger}
              css={{ marginTop: -5, marginBottom: -5, paddingLeft: 5 }}
            />
          }
        >
          {lang.providers.ledger_nano}
        </IconButton>
        {useMemo(
          () => (
            <LedgerModal
              show={showLedger}
              onClose={() => setShowLedger(false)}
              onAccountChosen={onAccountChosen}
            />
          ),
          [onAccountChosen, showLedger]
        )}
      </BrowserView>
      <BrowserView>
        <IconButton
          onClick={() => {
            connectToProviderOfType('walletconnect');
          }}
          disabled={!maker}
          icon={
            <img
              src={walletConnect}
              css={{ marginTop: -5, marginBottom: -5 }}
            />
          }
        >
          {lang.providers.wallet_connect}
        </IconButton>
      </BrowserView>
      <BrowserView>
        <IconButton
          onClick={() => {
            connectToProviderOfType('walletlink');
          }}
          disabled={!maker}
          icon={
            <img
              src={walletLink}
              css={{
                marginTop: -5,
                marginBottom: -5,
                paddingLeft: 2,
                width: 26
              }}
            />
          }
        >
          {lang.providers.wallet_link}
        </IconButton>
      </BrowserView>
    </Grid>
  );
}

export default WalletManager;
