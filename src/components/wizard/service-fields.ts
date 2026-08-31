/**
 * Purpose: Reassembles the full SERVICE_FIELDS map ServiceDetailModal reads
 *          from the three 300-line-cap-sized pieces above.
 * Inputs: none.
 * Outputs: SERVICE_FIELDS (all 11 service keys — identical shape to the
 *          original monolithic const).
 * Constraints: none — pure merge.
 */
import { requiredServiceFieldsA } from './service-fields/required-a'
import { requiredServiceFieldsB } from './service-fields/required-b'
import { optionalServiceFields } from './service-fields/optional'

export const SERVICE_FIELDS = {
  ...requiredServiceFieldsA,
  ...requiredServiceFieldsB,
  ...optionalServiceFields,
}
