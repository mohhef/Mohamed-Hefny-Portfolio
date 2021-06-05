import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useUser } from '@auth0/nextjs-auth0';

const CV = () => {
    const { user, error, isLoading } = useUser();
    return (
        <BaseLayout user = {user} isLoading = {isLoading}>
            <BasePage title = "My experience- Mohamed Hefny">
            </BasePage>
        </BaseLayout >
    )
}
export default CV;