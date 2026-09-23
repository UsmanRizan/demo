import type { Instrumentation } from "next";

/**
 * Reports uncaught server errors (render, route handlers, server actions) to
 * the error tracker. Errors caught inside routes go through logError instead.
 */
export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { captureException } = await import("@/lib/monitoring");

  const digest =
    typeof error === "object" && error !== null && "digest" in error
      ? String((error as { digest: unknown }).digest)
      : undefined;

  await captureException(error, {
    digest,
    path: request.path,
    method: request.method,
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
