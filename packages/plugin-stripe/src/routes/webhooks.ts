import Stripe from 'stripe';
import { PayloadRequest } from 'payload/dist/types';
import { StripeConfig } from '../types';
import { Response } from 'express';
import { handleWebhooks } from '../webhooks/handleWebhooks';

export const stripeWebhooks = async (
  req: PayloadRequest,
  res: Response,
  next: any,
  stripeConfig: StripeConfig
) => {
  const {
    stripeSecretKey,
    stripeWebhooksEndpointSecret,
    webhooks
  } = stripeConfig

  if (stripeWebhooksEndpointSecret) {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2022-08-01',
      appInfo: {
        name: 'Stripe Payload Plugin',
        url: 'https://payloadcms.com',
      }
    });

    const stripeSignature = req.headers['stripe-signature'];

    if (stripeSignature) {
      let event: Stripe.Event | undefined;

      try {
        event = stripe.webhooks.constructEvent(req.body, stripeSignature, stripeWebhooksEndpointSecret);
      } catch (err: any) {
        req.payload.logger.error(err?.message || 'Error constructing Stripe event');
        res.status(400);
      }

      if (event) {
        await handleWebhooks(req.payload, event, stripe, stripeConfig);

        // Fire external webhook handlers if they exist
        if (typeof webhooks === 'function') {
          webhooks(req.payload, event, stripe, stripeConfig);
        }

        if (typeof webhooks === 'object') {
          const webhookEventHandler = webhooks[event.type];
          if (typeof webhookEventHandler === 'function') {
            webhookEventHandler(req.payload, event, stripe, stripeConfig)
          };
        }
      }
    }
  }

  res.json({ received: true });
};
