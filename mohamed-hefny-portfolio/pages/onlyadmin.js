import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"

import withAuth from '@/hoc/withAuth'
import useSWR from "swr"

const OnlyAdmin = ({user, isLoading}) => {
        return (
            <BaseLayout user={user} isLoading={isLoading}>
                <BasePage>
                    <h1>Hello {user.name}</h1>
                </BasePage>
            </BaseLayout>
        )
}

export default withAuth(OnlyAdmin)('admin');