import React, { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  Grid,
  Link,
  Card,
  Checkbox,
  Flex
} from '@makerdao/ui-components-core';
import useStore from '../../hooks/useStore';
import useMaker from '../../hooks/useMaker';
import { TextBlock } from '../Typography';
import LoadingToggle from '../LoadingToggle';
import { addToastWithTimeout } from '../Toast';
import { prettifyNumber } from '../../utils/ui';
import { SAI } from '../../maker';
import AmountInputCard from '../AmountInputCard';
import round from 'lodash/round';

export default ({
  onNext,
  onPrev,
  showErrorMessageAndAllowExiting,
  setTxHash,
  exchangeRate
}) => {
  let [{ saiBalance = SAI(0) }, dispatch] = useStore();
  const { maker, account } = useMaker();
  const [hasReadTOS, setHasReadTOS] = useState(false);
  const [cageFreeApprovePending, setCageFreeApprovePending] = useState(false);

  const [redemptionInitiated, setRedemptionInitiated] = useState(false);
  const [proxyDetails, setProxyDetails] = useState({});
  const [saiAmountToRedeem, setSaiAmountToRedeem] = useState(SAI(0));
  const [valid, setValid] = useState(true);
  if (!maker) return null;

  const cageFreeAddress = maker
    .service('smartContract')
    .getContract('SAI_CAGEFREE').address;
  const max = saiBalance;

  const validate = value => {
    let msg;
    if (value.lte(0)) msg = 'Amount must be greater than 0';
    else if (value.gt(saiBalance)) msg = 'Insufficient Sai balance';
    setValid(!msg);
    return msg;
  };

  const giveProxyCageFreeAllowance = async () => {
    setCageFreeApprovePending(true);
    try {
      await maker
        .getToken('SAI')
        .approveUnlimited(cageFreeAddress);
      setProxyDetails(proxyDetails => ({
        ...proxyDetails,
        hasCageFreeAllowance: true
      }));
    } catch (err) {
      const message = err.message ? err.message : err;
      const errMsg = `unlock cagefree tx failed ${message}`;
      console.error(errMsg);
      addToastWithTimeout(errMsg, dispatch);
    }
    setCageFreeApprovePending(false);
  };

  const redeemSai = async () => {
    try {
      setRedemptionInitiated(true);
      const migration = await maker
        .service('migration')
        .getMigration('redeem-sai');
      const redeemTxObject = migration.redeemSai(saiAmountToRedeem);
      maker.service('transactionManager').listen(redeemTxObject, {
        pending: tx => {
          setTxHash(tx.hash);
          onNext();
        },
        error: () => showErrorMessageAndAllowExiting()
      });
      redeemTxObject.then(onNext);
    } catch (err) {
      const message = err.message ? err.message : err;
      const errMsg = `migrate tx failed ${message}`;
      console.error(errMsg);
      addToastWithTimeout(errMsg, dispatch);
    }
  };

  useEffect(() => {
    (async () => {
      if (maker && account) {
        const connectedWalletAllowance = await maker
          .getToken('SAI')
          .allowance(account.address, cageFreeAddress);
        let hasCageFreeAllowance = SAI(connectedWalletAllowance).gte(
            saiAmountToRedeem.toBigNumber().times(1.05)
          ) || SAI(connectedWalletAllowance).toNumber() === 1.157920892373162e+59;
        if (saiAmountToRedeem.toNumber() === 0) hasCageFreeAllowance = false;
        setProxyDetails({ hasCageFreeAllowance });
      }
    })();
  }, [account, cageFreeAddress, maker, saiAmountToRedeem]);

  return (
    <Grid maxWidth="912px" gridRowGap="m" px={['s', 0]}>
      <Text.h2 textAlign="center">Redeem Sai for Collateral</Text.h2>
      <Text.p
        textAlign="center"
        t="body"
        fontSize="1.8rem"
        m="0 auto"
        display={{ s: 'none', m: 'block' }}
      >
        Redeem your Sai for a proportional amount of ETH from the
        Single-Collateral Sai system.
      </Text.p>
      <Grid
        gridTemplateColumns={{ s: 'minmax(0, 1fr)', l: '2fr 1fr' }}
        gridGap="m"
        mt={{ s: 'xs', l: 'm' }}
        mb={{ s: 'xs', l: 'xs' }}
      >
        <AmountInputCard
          max={max}
          unit={SAI}
          update={setSaiAmountToRedeem}
          validate={validate}
          title="Enter the amount you would like to redeem."
        >
          <Box>
            <Text
              fontSize={['20px', '16px']}
              t="subheading"
            >Sai Balance</Text>
            <Text
              t="caption"
              display="inline-block"
              ml="s"
              color="darkLavender"
              fontSize={['20px', '16px']}
            >
              {saiBalance ? prettifyNumber(saiBalance) : '...'}
            </Text>
          </Box>
        </AmountInputCard>
        <Card px={{ s: 'm', m: 'l' }} py={{ s: 'm', m: 'l' }}>
          <Grid gridRowGap="m">
            <Grid gridRowGap="xs">
              <TextBlock t="h5" lineHeight="normal" fontSize={['24px', '16px']}>
                Sai Balance:
              </TextBlock>
              <TextBlock t="body" fontSize={['24px', '16px']}>{`${saiBalance}`}</TextBlock>
            </Grid>
            <Grid gridRowGap="xs">
              <TextBlock t="h5" lineHeight="normal" fontSize={['24px', '16px']}>
                Exchange Rate
              </TextBlock>
              <TextBlock t="body" fontSize={['24px', '16px']}>{`1 SAI : ${
                exchangeRate ? round(exchangeRate, 4) : '...'
              } ETH`}</TextBlock>
            </Grid>
            <Grid gridRowGap="xs">
              <TextBlock t="h5" lineHeight="normal" fontSize={['24px', '16px']}>
                Sai Balance in ETH
              </TextBlock>
              <TextBlock t="body" fontSize={['24px', '16px']}>
                {round(saiBalance.toNumber() * exchangeRate, 4)} ETH
              </TextBlock>
            </Grid>
          </Grid>
        </Card>
      </Grid>
      <Card>
        <Grid mx={'xl'} px={'xl'} py={'m'}>
          <LoadingToggle
            completeText={'Sai unlocked'}
            loadingText={'Unlocking Sai'}
            defaultText={'Unlock Sai to continue'}
            tokenDisplayName={'SAI'}
            isLoading={cageFreeApprovePending}
            isComplete={proxyDetails.hasCageFreeAllowance}
            onToggle={giveProxyCageFreeAllowance}
            disabled={proxyDetails.hasCageFreeAllowance}
            testId="allowance-toggle"
            mx={'xl'}
            px={'xl'}
          />
        </Grid>
      </Card>
      <Flex
        alignItems="center"
        gridTemplateColumns="auto 1fr"
        flexDirection="row"
        justifyContent="center"
        pb={'m'}
      >
        <Checkbox
          mr="s"
          fontSize="l"
          checked={hasReadTOS}
          onChange={() => setHasReadTOS(!hasReadTOS)}
        />
        <Text
          t="caption"
          color="steel"
          data-testid="terms"
          fontSize={['26px', '16px']}
          onClick={() => setHasReadTOS(!hasReadTOS)}
        >
          I have read and accept the{' '}
          <Link target="_blank" href="/terms">
            Terms of Service
          </Link>
          .
        </Text>
      </Flex>
      <Grid
        justifySelf="center"
        justifyContent="center"
        gridTemplateColumns="auto auto"
        gridColumnGap="m"
        width={['100vw', 'auto']}
        height={{ s: '75px' }}
      >
        <Button
          variant="secondary-outline"
          onClick={onPrev}
          width={{ s: '200px' }}
          fontSize={['26px', '16px']}
        >
          Cancel
        </Button>
        <Button
          disabled={
            !hasReadTOS ||
            !proxyDetails.hasCageFreeAllowance ||
            redemptionInitiated ||
            !saiAmountToRedeem.toNumber() ||
            !valid
          }
          onClick={() => {
            dispatch({ type: 'assign', payload: { saiAmountToRedeem } });
            redeemSai();
          }}
          width={{ s: '200px' }}
          fontSize={['26px', '16px']}

        >
          Continue
        </Button>
      </Grid>
    </Grid>
  );
};
