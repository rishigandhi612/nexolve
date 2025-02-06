// paypal.d.ts
declare module '@paypal/checkout-server-sdk' {
  import * as core from '@paypal/checkout-server-sdk/dist/core';
  import * as orders from '@paypal/checkout-server-sdk/dist/orders';
  import * as notifications from '@paypal/checkout-server-sdk/dist/notifications';

  export { core, orders, notifications };
}