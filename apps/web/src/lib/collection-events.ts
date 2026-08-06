import { createEventChannel } from "./event-channel";
import type { CollectionWithProducts } from "./types";

const channel = createEventChannel<CollectionWithProducts>("selltns:collection-created");
export const emitCollectionCreated = channel.emit;
export const onCollectionCreated = channel.on;
