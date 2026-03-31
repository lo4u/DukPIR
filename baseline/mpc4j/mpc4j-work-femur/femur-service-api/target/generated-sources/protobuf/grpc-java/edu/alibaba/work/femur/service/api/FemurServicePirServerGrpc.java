package edu.alibaba.work.femur.service.api;

import static io.grpc.MethodDescriptor.generateFullMethodName;
import static io.grpc.stub.ClientCalls.asyncBidiStreamingCall;
import static io.grpc.stub.ClientCalls.asyncClientStreamingCall;
import static io.grpc.stub.ClientCalls.asyncServerStreamingCall;
import static io.grpc.stub.ClientCalls.asyncUnaryCall;
import static io.grpc.stub.ClientCalls.blockingServerStreamingCall;
import static io.grpc.stub.ClientCalls.blockingUnaryCall;
import static io.grpc.stub.ClientCalls.futureUnaryCall;
import static io.grpc.stub.ServerCalls.asyncBidiStreamingCall;
import static io.grpc.stub.ServerCalls.asyncClientStreamingCall;
import static io.grpc.stub.ServerCalls.asyncServerStreamingCall;
import static io.grpc.stub.ServerCalls.asyncUnaryCall;
import static io.grpc.stub.ServerCalls.asyncUnimplementedStreamingCall;
import static io.grpc.stub.ServerCalls.asyncUnimplementedUnaryCall;

/**
 * <pre>
 * service
 * </pre>
 */
@javax.annotation.Generated(
    value = "by gRPC proto compiler (version 1.31.1)",
    comments = "Source: femur_service_pir_server.proto")
public final class FemurServicePirServerGrpc {

  private FemurServicePirServerGrpc() {}

  public static final String SERVICE_NAME = "edu.alibaba.work.femur.service.api.FemurServicePirServer";

  // Static method descriptors that strictly reflect the proto.
  private static volatile io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> getRegisterMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "register",
      requestType = edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest.class,
      responseType = edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> getRegisterMethod() {
    io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> getRegisterMethod;
    if ((getRegisterMethod = FemurServicePirServerGrpc.getRegisterMethod) == null) {
      synchronized (FemurServicePirServerGrpc.class) {
        if ((getRegisterMethod = FemurServicePirServerGrpc.getRegisterMethod) == null) {
          FemurServicePirServerGrpc.getRegisterMethod = getRegisterMethod =
              io.grpc.MethodDescriptor.<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "register"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FemurServicePirServerMethodDescriptorSupplier("register"))
              .build();
        }
      }
    }
    return getRegisterMethod;
  }

  private static volatile io.grpc.MethodDescriptor<com.google.protobuf.Empty,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> getGetHintMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "getHint",
      requestType = com.google.protobuf.Empty.class,
      responseType = edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<com.google.protobuf.Empty,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> getGetHintMethod() {
    io.grpc.MethodDescriptor<com.google.protobuf.Empty, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> getGetHintMethod;
    if ((getGetHintMethod = FemurServicePirServerGrpc.getGetHintMethod) == null) {
      synchronized (FemurServicePirServerGrpc.class) {
        if ((getGetHintMethod = FemurServicePirServerGrpc.getGetHintMethod) == null) {
          FemurServicePirServerGrpc.getGetHintMethod = getGetHintMethod =
              io.grpc.MethodDescriptor.<com.google.protobuf.Empty, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "getHint"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  com.google.protobuf.Empty.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FemurServicePirServerMethodDescriptorSupplier("getHint"))
              .build();
        }
      }
    }
    return getGetHintMethod;
  }

  private static volatile io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> getQueryMethod;

  @io.grpc.stub.annotations.RpcMethod(
      fullMethodName = SERVICE_NAME + '/' + "query",
      requestType = edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest.class,
      responseType = edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse.class,
      methodType = io.grpc.MethodDescriptor.MethodType.UNARY)
  public static io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest,
      edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> getQueryMethod() {
    io.grpc.MethodDescriptor<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> getQueryMethod;
    if ((getQueryMethod = FemurServicePirServerGrpc.getQueryMethod) == null) {
      synchronized (FemurServicePirServerGrpc.class) {
        if ((getQueryMethod = FemurServicePirServerGrpc.getQueryMethod) == null) {
          FemurServicePirServerGrpc.getQueryMethod = getQueryMethod =
              io.grpc.MethodDescriptor.<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest, edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse>newBuilder()
              .setType(io.grpc.MethodDescriptor.MethodType.UNARY)
              .setFullMethodName(generateFullMethodName(SERVICE_NAME, "query"))
              .setSampledToLocalTracing(true)
              .setRequestMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest.getDefaultInstance()))
              .setResponseMarshaller(io.grpc.protobuf.ProtoUtils.marshaller(
                  edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse.getDefaultInstance()))
              .setSchemaDescriptor(new FemurServicePirServerMethodDescriptorSupplier("query"))
              .build();
        }
      }
    }
    return getQueryMethod;
  }

  /**
   * Creates a new async stub that supports all call types for the service
   */
  public static FemurServicePirServerStub newStub(io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerStub>() {
        @java.lang.Override
        public FemurServicePirServerStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FemurServicePirServerStub(channel, callOptions);
        }
      };
    return FemurServicePirServerStub.newStub(factory, channel);
  }

  /**
   * Creates a new blocking-style stub that supports unary and streaming output calls on the service
   */
  public static FemurServicePirServerBlockingStub newBlockingStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerBlockingStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerBlockingStub>() {
        @java.lang.Override
        public FemurServicePirServerBlockingStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FemurServicePirServerBlockingStub(channel, callOptions);
        }
      };
    return FemurServicePirServerBlockingStub.newStub(factory, channel);
  }

  /**
   * Creates a new ListenableFuture-style stub that supports unary calls on the service
   */
  public static FemurServicePirServerFutureStub newFutureStub(
      io.grpc.Channel channel) {
    io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerFutureStub> factory =
      new io.grpc.stub.AbstractStub.StubFactory<FemurServicePirServerFutureStub>() {
        @java.lang.Override
        public FemurServicePirServerFutureStub newStub(io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
          return new FemurServicePirServerFutureStub(channel, callOptions);
        }
      };
    return FemurServicePirServerFutureStub.newStub(factory, channel);
  }

  /**
   * <pre>
   * service
   * </pre>
   */
  public static abstract class FemurServicePirServerImplBase implements io.grpc.BindableService {

    /**
     * <pre>
     * client register
     * </pre>
     */
    public void register(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> responseObserver) {
      asyncUnimplementedUnaryCall(getRegisterMethod(), responseObserver);
    }

    /**
     * <pre>
     * client hint request
     * </pre>
     */
    public void getHint(com.google.protobuf.Empty request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> responseObserver) {
      asyncUnimplementedUnaryCall(getGetHintMethod(), responseObserver);
    }

    /**
     * <pre>
     * client PIR query
     * </pre>
     */
    public void query(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> responseObserver) {
      asyncUnimplementedUnaryCall(getQueryMethod(), responseObserver);
    }

    @java.lang.Override public final io.grpc.ServerServiceDefinition bindService() {
      return io.grpc.ServerServiceDefinition.builder(getServiceDescriptor())
          .addMethod(
            getRegisterMethod(),
            asyncUnaryCall(
              new MethodHandlers<
                edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest,
                edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse>(
                  this, METHODID_REGISTER)))
          .addMethod(
            getGetHintMethod(),
            asyncUnaryCall(
              new MethodHandlers<
                com.google.protobuf.Empty,
                edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse>(
                  this, METHODID_GET_HINT)))
          .addMethod(
            getQueryMethod(),
            asyncUnaryCall(
              new MethodHandlers<
                edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest,
                edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse>(
                  this, METHODID_QUERY)))
          .build();
    }
  }

  /**
   * <pre>
   * service
   * </pre>
   */
  public static final class FemurServicePirServerStub extends io.grpc.stub.AbstractAsyncStub<FemurServicePirServerStub> {
    private FemurServicePirServerStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FemurServicePirServerStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FemurServicePirServerStub(channel, callOptions);
    }

    /**
     * <pre>
     * client register
     * </pre>
     */
    public void register(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> responseObserver) {
      asyncUnaryCall(
          getChannel().newCall(getRegisterMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * client hint request
     * </pre>
     */
    public void getHint(com.google.protobuf.Empty request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> responseObserver) {
      asyncUnaryCall(
          getChannel().newCall(getGetHintMethod(), getCallOptions()), request, responseObserver);
    }

    /**
     * <pre>
     * client PIR query
     * </pre>
     */
    public void query(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest request,
        io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> responseObserver) {
      asyncUnaryCall(
          getChannel().newCall(getQueryMethod(), getCallOptions()), request, responseObserver);
    }
  }

  /**
   * <pre>
   * service
   * </pre>
   */
  public static final class FemurServicePirServerBlockingStub extends io.grpc.stub.AbstractBlockingStub<FemurServicePirServerBlockingStub> {
    private FemurServicePirServerBlockingStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FemurServicePirServerBlockingStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FemurServicePirServerBlockingStub(channel, callOptions);
    }

    /**
     * <pre>
     * client register
     * </pre>
     */
    public edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse register(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest request) {
      return blockingUnaryCall(
          getChannel(), getRegisterMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * client hint request
     * </pre>
     */
    public edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse getHint(com.google.protobuf.Empty request) {
      return blockingUnaryCall(
          getChannel(), getGetHintMethod(), getCallOptions(), request);
    }

    /**
     * <pre>
     * client PIR query
     * </pre>
     */
    public edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse query(edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest request) {
      return blockingUnaryCall(
          getChannel(), getQueryMethod(), getCallOptions(), request);
    }
  }

  /**
   * <pre>
   * service
   * </pre>
   */
  public static final class FemurServicePirServerFutureStub extends io.grpc.stub.AbstractFutureStub<FemurServicePirServerFutureStub> {
    private FemurServicePirServerFutureStub(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      super(channel, callOptions);
    }

    @java.lang.Override
    protected FemurServicePirServerFutureStub build(
        io.grpc.Channel channel, io.grpc.CallOptions callOptions) {
      return new FemurServicePirServerFutureStub(channel, callOptions);
    }

    /**
     * <pre>
     * client register
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse> register(
        edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest request) {
      return futureUnaryCall(
          getChannel().newCall(getRegisterMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * client hint request
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse> getHint(
        com.google.protobuf.Empty request) {
      return futureUnaryCall(
          getChannel().newCall(getGetHintMethod(), getCallOptions()), request);
    }

    /**
     * <pre>
     * client PIR query
     * </pre>
     */
    public com.google.common.util.concurrent.ListenableFuture<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse> query(
        edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest request) {
      return futureUnaryCall(
          getChannel().newCall(getQueryMethod(), getCallOptions()), request);
    }
  }

  private static final int METHODID_REGISTER = 0;
  private static final int METHODID_GET_HINT = 1;
  private static final int METHODID_QUERY = 2;

  private static final class MethodHandlers<Req, Resp> implements
      io.grpc.stub.ServerCalls.UnaryMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ServerStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.ClientStreamingMethod<Req, Resp>,
      io.grpc.stub.ServerCalls.BidiStreamingMethod<Req, Resp> {
    private final FemurServicePirServerImplBase serviceImpl;
    private final int methodId;

    MethodHandlers(FemurServicePirServerImplBase serviceImpl, int methodId) {
      this.serviceImpl = serviceImpl;
      this.methodId = methodId;
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public void invoke(Req request, io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        case METHODID_REGISTER:
          serviceImpl.register((edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterRequest) request,
              (io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.RegisterResponse>) responseObserver);
          break;
        case METHODID_GET_HINT:
          serviceImpl.getHint((com.google.protobuf.Empty) request,
              (io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.HintResponse>) responseObserver);
          break;
        case METHODID_QUERY:
          serviceImpl.query((edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryRequest) request,
              (io.grpc.stub.StreamObserver<edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.QueryResponse>) responseObserver);
          break;
        default:
          throw new AssertionError();
      }
    }

    @java.lang.Override
    @java.lang.SuppressWarnings("unchecked")
    public io.grpc.stub.StreamObserver<Req> invoke(
        io.grpc.stub.StreamObserver<Resp> responseObserver) {
      switch (methodId) {
        default:
          throw new AssertionError();
      }
    }
  }

  private static abstract class FemurServicePirServerBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoFileDescriptorSupplier, io.grpc.protobuf.ProtoServiceDescriptorSupplier {
    FemurServicePirServerBaseDescriptorSupplier() {}

    @java.lang.Override
    public com.google.protobuf.Descriptors.FileDescriptor getFileDescriptor() {
      return edu.alibaba.work.femur.service.api.FemurServicePirServerOuterClass.getDescriptor();
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.ServiceDescriptor getServiceDescriptor() {
      return getFileDescriptor().findServiceByName("FemurServicePirServer");
    }
  }

  private static final class FemurServicePirServerFileDescriptorSupplier
      extends FemurServicePirServerBaseDescriptorSupplier {
    FemurServicePirServerFileDescriptorSupplier() {}
  }

  private static final class FemurServicePirServerMethodDescriptorSupplier
      extends FemurServicePirServerBaseDescriptorSupplier
      implements io.grpc.protobuf.ProtoMethodDescriptorSupplier {
    private final String methodName;

    FemurServicePirServerMethodDescriptorSupplier(String methodName) {
      this.methodName = methodName;
    }

    @java.lang.Override
    public com.google.protobuf.Descriptors.MethodDescriptor getMethodDescriptor() {
      return getServiceDescriptor().findMethodByName(methodName);
    }
  }

  private static volatile io.grpc.ServiceDescriptor serviceDescriptor;

  public static io.grpc.ServiceDescriptor getServiceDescriptor() {
    io.grpc.ServiceDescriptor result = serviceDescriptor;
    if (result == null) {
      synchronized (FemurServicePirServerGrpc.class) {
        result = serviceDescriptor;
        if (result == null) {
          serviceDescriptor = result = io.grpc.ServiceDescriptor.newBuilder(SERVICE_NAME)
              .setSchemaDescriptor(new FemurServicePirServerFileDescriptorSupplier())
              .addMethod(getRegisterMethod())
              .addMethod(getGetHintMethod())
              .addMethod(getQueryMethod())
              .build();
        }
      }
    }
    return result;
  }
}
