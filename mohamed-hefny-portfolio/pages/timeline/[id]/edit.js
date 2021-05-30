
import BaseLayout from '@/components/layouts/BaseLayout';
import BasePage from '@/components/BasePage';
import withAuth from '@/hoc/withAuth';
import { useRouter } from 'next/router';
import { useGetTimeline } from '@/actions/timeline'
import { useUpdateTimeline } from '@/actions/timeline'
import TimelineForm from '@/components/TimelineForm'
import { Row, Col } from 'reactstrap'
import {toast} from 'react-toastify';

const TimelineEdit = ({ user }) => {

  const router = useRouter();
  const { data: initialData } = useGetTimeline(router.query.id);
  const [updatePortfolio, {error}] = useUpdateTimeline();

  const _updatePortfolio = (data) => {
    updatePortfolio(router.query.id, data);
    toast.success("Timeline has been update!", {autoClose=2000})
  }

  return (
    <BaseLayout user={user} loading={false}>
      <BasePage header="Timeline Edit">
        <Row>
          <Col md="8">
            {initialData &&
              <TimelineForm
                onSubmit={_updatePortfolio}
                initialData={initialData} />
            }
          </Col>
        </Row>
      </BasePage>
    </BaseLayout>
  )
}



export default withAuth(TimelineEdit)('admin');