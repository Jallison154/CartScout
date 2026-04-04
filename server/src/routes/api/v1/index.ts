import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { listsRouter } from './lists.routes.js';
import { productsRouter } from './products.routes.js';
import { storesRouter } from './stores.routes.js';

export const apiV1Router = Router();

apiV1Router.use('/auth', authRouter);
apiV1Router.use('/lists', listsRouter);
apiV1Router.use('/products', productsRouter);
apiV1Router.use('/stores', storesRouter);
