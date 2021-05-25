import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import Timeline  from "./timelineelement"


const History = () => {
    return (
        <BaseLayout>
            <BasePage>
                <h1 className="title">Timeline</h1>
                <Timeline/>
            </BasePage>
        </BaseLayout >
    )

}
export default History;