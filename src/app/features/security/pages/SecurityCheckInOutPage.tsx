import { Link } from "react-router";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Input } from "@/app/components/ui/input";
import {
  ArrowRight,
  LogOut,
  LogIn,
  User,
  Clock,
  AlertTriangle,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useWorkflow } from "@/app/context/WorkflowContext";
import { requestStatusLabels } from "@/app/types/workflow";

export function SecurityCheckInOutPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const {
    requests,
    checkOutRequest,
    checkInRequest,
    completeRequest,
  } = useWorkflow();

  const approvedRequests = requests.filter(
    (request) => request.status === "approved"
  );

  const outsideRequests = requests.filter((request) =>
    ["checked_out", "in_diagnosis", "prescribed", "dispensed"].includes(
      request.status
    )
  );

  const readyForReturnRequests = requests.filter(
    (request) => request.status === "dispensed"
  );

  const filteredApprovedRequests = approvedRequests.filter((request) =>
    `${request.employeeName} ${request.financialNumber} ${request.id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const filteredOutsideRequests = outsideRequests.filter((request) =>
    `${request.employeeName} ${request.financialNumber} ${request.id}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const handleCheckOut = (requestId: string, employeeName: string) => {
    checkOutRequest(requestId);
    toast.success(`تم تسجيل خروج ${employeeName}`);
  };

  const handleCheckInAndComplete = (requestId: string, employeeName: string) => {
    checkInRequest(requestId);
    completeRequest(requestId);
    toast.success(`تم تسجيل عودة ${employeeName} وإغلاق الطلب`);
  };

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <header className="bg-white shadow">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/security">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </Button>

              <h1 className="text-2xl font-bold">
                نظام الأمن - تسجيل الدخول والخروج
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="ابحث عن موظف أو رقم طلب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {readyForReturnRequests.length > 0 && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <LogIn className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">
                    طلبات جاهزة لتسجيل العودة
                  </h3>
                  <p className="text-sm text-green-800">
                    يوجد {readyForReturnRequests.length} طلب تم صرف العلاج له
                    وجاهز للعودة والإغلاق.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">جاهز للخروج</h2>
                <Badge variant="secondary">
                  {filteredApprovedRequests.length}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                الطلبات التي تمت الموافقة عليها
              </p>
            </div>

            <div className="space-y-3">
              {filteredApprovedRequests.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا توجد طلبات معتمدة جاهزة لتسجيل الخروج
                </div>
              )}

              {filteredApprovedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-50 rounded-lg">
                        <User className="w-5 h-5 text-green-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">
                              {request.employeeName}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {request.financialNumber}
                            </p>
                          </div>

                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {requestStatusLabels[request.status]}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <span>{request.department}</span>
                          <span>
                            النوع:{" "}
                            {request.requestType === "emergency"
                              ? "كشف طوارئ"
                              : "كشف عادي"}
                          </span>
                        </div>

                        <Button
                          size="sm"
                          className="w-full"
                          onClick={() =>
                            handleCheckOut(request.id, request.employeeName)
                          }
                        >
                          <LogOut className="w-4 h-4 ml-2" />
                          تسجيل خروج
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-semibold">موظفون خارج المبنى</h2>
                <Badge variant="secondary">{filteredOutsideRequests.length}</Badge>
              </div>
              <p className="text-sm text-gray-600">
                الموظفون المتواجدون خارج المبنى حالياً
              </p>
            </div>

            <div className="space-y-3">
              {filteredOutsideRequests.length === 0 && (
                <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-500">
                  لا يوجد موظفون خارج المبنى حالياً
                </div>
              )}

              {filteredOutsideRequests.map((request) => {
                const isReadyForReturn = request.status === "dispensed";

                return (
                  <Card
                    key={request.id}
                    className={
                      isReadyForReturn ? "border-green-200" : "border-blue-200"
                    }
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            isReadyForReturn ? "bg-green-50" : "bg-blue-50"
                          }`}
                        >
                          <User
                            className={`w-5 h-5 ${
                              isReadyForReturn
                                ? "text-green-600"
                                : "text-blue-600"
                            }`}
                          />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">
                                {request.employeeName}
                              </h3>
                              <p className="text-sm text-gray-600">
                                {request.financialNumber}
                              </p>
                            </div>

                            <Badge
                              variant="outline"
                              className={
                                isReadyForReturn
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-blue-50 text-blue-700 border-blue-200"
                              }
                            >
                              <Clock className="w-3 h-3 ml-1" />
                              {requestStatusLabels[request.status]}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span>{request.department}</span>
                            <span>{request.id}</span>
                          </div>

                          {isReadyForReturn ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full border-green-300 text-green-700 hover:bg-green-50"
                              onClick={() =>
                                handleCheckInAndComplete(
                                  request.id,
                                  request.employeeName
                                )
                              }
                            >
                              <LogIn className="w-4 h-4 ml-2" />
                              تسجيل العودة وإغلاق الطلب
                            </Button>
                          ) : (
                            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                              الطلب ما زال داخل مسار الكشف أو الصيدلية.
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>

        {readyForReturnRequests.length > 0 && (
          <div className="mt-6">
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <LogIn className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-green-900">
                  جاهز للعودة
                </h2>
                <Badge className="bg-green-600">
                  {readyForReturnRequests.length}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                الطلبات التي تم صرف العلاج لها وجاهزة للإغلاق
              </p>
            </div>

            <div className="space-y-3">
              {readyForReturnRequests.map((request) => (
                <Card key={request.id} className="border-green-200">
                  <CardContent className="p-4 bg-green-50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <User className="w-5 h-5 text-green-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-green-900">
                              {request.employeeName}
                            </h3>
                            <p className="text-sm text-green-700">
                              {request.financialNumber}
                            </p>
                          </div>

                          <Badge className="bg-green-600">
                            {requestStatusLabels[request.status]}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-sm text-green-700 mb-3">
                          <span>{request.department}</span>
                          <span>{request.id}</span>
                        </div>

                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700"
                          onClick={() =>
                            handleCheckInAndComplete(
                              request.id,
                              request.employeeName
                            )
                          }
                        >
                          <LogIn className="w-4 h-4 ml-2" />
                          تسجيل العودة وإغلاق الطلب
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}