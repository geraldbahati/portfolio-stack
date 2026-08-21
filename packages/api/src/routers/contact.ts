import { contactSubmitSchema } from "../contact/schema";
import { submitContact } from "../contact/submit";
import { publicProcedure } from "../index";

export const contactRouter = {
  submit: publicProcedure.input(contactSubmitSchema).handler(async ({ input, context }) => {
    return submitContact(input, context.ip);
  }),
};
