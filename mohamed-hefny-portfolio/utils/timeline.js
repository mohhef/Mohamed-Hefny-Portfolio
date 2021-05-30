import { isAuthorized } from "@/utils/auth0"
import { useRouter } from "next/router"

export const timelineElementClick = (user, linkId, website) => {
    const router = useRouter();
    if (isAuthorized(user, 'admin')) {
        return () => {
            router.push('/timeline/[id]/edit', `/timeline/${linkId}/edit`)}
        }else{
            return () => (window.location.href = `https://${website}`)
        }

    }