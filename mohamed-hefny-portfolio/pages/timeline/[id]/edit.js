
import BaseLayout from '@/components/layouts/BaseLayout';
import BasePage from '@/components/BasePage';
import withAuth from '@/hoc/withAuth';
import { useRouter } from 'next/router';
import { useGetTimeline } from '@/actions/timeline'
import { useUpdateTimeline } from '@/actions/timeline'
import TimelineForm from '@/components/TimelineForm'
import { Row, Col } from 'reactstrap'
import { toast } from 'react-toastify';

const TimelineEdit = ({ user }) => {

  const router = useRouter();
  const { data: initialData } = useGetTimeline(router.query.id);
  const [updatePortfolio, { error }] = useUpdateTimeline();

  const _updatePortfolio = async (data) => {
    // try {
    //   await updatePortfolio(router.query.id, data);
    //   toast.success('Portfolio has been updated!', {autoClose: 2000})
    // } catch {
    //   toast.error('Ooops some error!', {autoClose: 2000})
    // }

    // updatePortfolio(router.query.id, data)
    //   .then(() => toast.success('Portfolio has been updated!', {autoClose: 2000}))
    //   .catch(() => toast.error('Ooops some error!', {autoClose: 2000}))

    await updatePortfolio(router.query.id, data);
    toast.success("Timeline has been update!", { autoClose: 2000 })
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
            {error && <div className="alert alert-danger mt-2">{error}</div>}
          </Col>
        </Row>
      </BasePage>
    </BaseLayout>
  )
}



export default withAuth(TimelineEdit)('admin');