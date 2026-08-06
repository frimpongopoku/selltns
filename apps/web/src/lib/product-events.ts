import { createEventChannel } from "./event-channel";
import type { Product } from "./types";

const channel = createEventChannel<Product>("selltns:product-created");
export const emitProductCreated = channel.emit;
export const onProductCreated = channel.on;
