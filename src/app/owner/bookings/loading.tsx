// Loading UI lives in leaf segments only: a loading boundary makes the page
// stream, and streamed notFound() responses are sent with HTTP 200.
export { default } from "@/components/PageLoading";
