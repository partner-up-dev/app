-- Stable development-only payment-provider baseline for local checkout work.
-- migration: environments=development
--
-- Keep this file limited to long-lived local baseline data. Do not add
-- scenario-only providers, real credentials, or per-run cleanup logic here.

do $$
declare
  provider_instance_key constant text := 'mch:1900000001:app:wx_partnerup_local_web';
  provider_client_id constant text := 'web';
  provider_display_name constant text := '微信支付';
  provider_endpoint_base_url constant text := 'https://wechatpay.partner-up.localhost';
  provider_app_id constant text := 'wx_partnerup_local_web';
  provider_mch_id constant text := '1900000001';
  provider_api_v3_key constant text := '0123456789abcdef0123456789abcdef';
  provider_charge_mode constant text := 'JSAPI';
  merchant_serial_no constant text := 'LOCAL_MERCHANT_SERIAL_000000000001';
  merchant_private_key_pem constant text := $merchant_private$
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCijFRIVWtysoSJ
ziyobX78pf83LVov3gwBDZwLN4eUJ2hLHB34/9xJc4tSsyu7LUThxtVaKSisoUi8
BzFkA9A+jAmr7/PPhdg3gcJ24hOFM/JjaoPQJ12woqAaVeTEgqyEHGRh3k/3tJOI
ToTBjWjbdxZ1P/MQnDfx/zFZSCmZE+3DBVuSkqWQjRMHAik0PE6+whsRoekcHZzo
rBrKRk7C54TrjE3pa/OLmC5efQwFtjuZ2qODiHDxrtDTLoW2IZohYddv8cddLSoZ
1Rwe16yAia4HHNB/HzMZkCDYSMJ4dt+tsKa17H3cO4LqoBM0LPSKaJe4Rr2Zszof
ZfdbAEGVAgMBAAECggEAD9lK5nqdrWNGlQErTYjPlubAiaq8XmpyFTA0hMt3RrTI
8HnfWkXoPqkrbnbVzrxNOQ5gAxh8RMi9BMhWwn+0sESLNN6CkTtlp5PZWCoW6Sf1
fEgIbiVId06D+c1iLt7m30K9buV0Opy6vdGaFB0rmip0YB5KHtZ8hfXx49irZadp
/oi9g3dIvBehrGuPLdJ3zuehhj/nV9aB63TN8eBPuffqREqUIsUB/e7aKvPM3tuB
YhBChhYPdxeI0ihKH8Lq/63wvfBA3TNrKUGuULDU8pMrkLNFJvUK2NzKQoEydvPY
k7jHuh2K7dwKhQbT5gQ8JZPe6o9fvYjWoLi+uHY7QQKBgQDRKoEezGKCbPFy6JTQ
4URN3RbJ7Npy9RNXRadV7qfTdIvQrYKmbztjC6gp4cuaPDbo8x/PQh5Gcx0z9pQS
VIuIvq8w8R1ATQFHksdjbZHo7McDvcUVagdLXVYQnIbWtukF6Y6H0WYbvOZRcjIR
BW4Zt+pET3JTSta/QPf26l0oTQKBgQDG8aqdjqEbEklEIhBBbt3RO26Qm4wvaYzO
QG+FDQvJ0UwR+wTo4rUPnumF+iukeuElZde7FRUCyUkaWaJfMAbvEWnMuFH4s9sa
qxOB87sAan3AfIJdAZ17VGYq3P28UOK42h0DxkRRevUHHx3EIcKIs5B+lGf+bFL6
hqM6KXKiaQKBgHiDhOG54QhEvNj4KMYxBKnYOMkfLr4NdpdSCpf4abnr7KLPVfeP
HyhyDvISpry29OxDKJDCB6+Po8PMzoPBMqQXOdl5EuF5fMNATqF7ABa0VfZR4Lv1
2z4RCQWJKieMO7asWvLmM27H5+wFX9NuzYED9nZlT/mtpQ2M4VHitsoBAoGASiEa
lgLjfRbfPggDTp5lAOXIWRHctn35/ZB8/XLTBax7T+fc+HohRWTNVyLUyEERS8Ib
FJbScWtXVf44Roe6zbILXkEAKk+6QMGmTzHmaE1F9kduvAEyERZty2L1GQp6sK51
SUbDhijuzGyHxuFdf1qJaOEbru3mLXulrrJrCKECgYEAxnxm9yv/TulmJm486Ljk
jhCmFxCj8gW71R5iEOc4kHoOcBBamAdapeBp8UoK9tCkksgGjMfJ2+yMo992/gY0
MoWRKTLPy5UiimRwZz35hz/5ul1CljvcEmbpnLRfRmndNqse27fKxmZbzGH6hU7I
plVhsSlu1LQ6e1EbD689whE=
-----END PRIVATE KEY-----
$merchant_private$;
  merchant_certificate_pem constant text := $merchant_public$
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAooxUSFVrcrKEic4sqG1+
/KX/Ny1aL94MAQ2cCzeHlCdoSxwd+P/cSXOLUrMruy1E4cbVWikorKFIvAcxZAPQ
PowJq+/zz4XYN4HCduIThTPyY2qD0CddsKKgGlXkxIKshBxkYd5P97STiE6EwY1o
23cWdT/zEJw38f8xWUgpmRPtwwVbkpKlkI0TBwIpNDxOvsIbEaHpHB2c6KwaykZO
wueE64xN6Wvzi5guXn0MBbY7mdqjg4hw8a7Q0y6FtiGaIWHXb/HHXS0qGdUcHtes
gImuBxzQfx8zGZAg2EjCeHbfrbCmtex93DuC6qATNCz0imiXuEa9mbM6H2X3WwBB
lQIDAQAB
-----END PUBLIC KEY-----
$merchant_public$;

  v_provider_instance_id uuid;
begin
  update payment_provider_instances
     set status = 'DISABLED',
         updated_at = now()
   where client_id = provider_client_id
     and status = 'ACTIVE'
     and instance_key <> provider_instance_key;

  select id
    into v_provider_instance_id
    from payment_provider_instances
   where provider_type = 'WECHAT_PAY'
     and instance_key = provider_instance_key
   order by created_at asc
   limit 1;

  if v_provider_instance_id is null then
    insert into payment_provider_instances (
      provider_type,
      instance_key,
      status,
      display_name,
      client_id,
      config,
      created_at,
      updated_at
    )
    values (
      'WECHAT_PAY',
      provider_instance_key,
      'ACTIVE',
      provider_display_name,
      provider_client_id,
      jsonb_build_object(
        'adapterMode', 'WECHAT_PAY_API_V3',
        'appId', provider_app_id,
        'mchId', provider_mch_id,
        'chargeMode', provider_charge_mode,
        'endpointBaseUrl', provider_endpoint_base_url,
        'apiV3Key', provider_api_v3_key,
        'merchantCertificate', jsonb_build_object(
          'serialNo', merchant_serial_no,
          'privateKeyPem', merchant_private_key_pem,
          'certificatePem', merchant_certificate_pem
        ),
        'platformCertificates', null
      ),
      now(),
      now()
    )
    returning id into v_provider_instance_id;
  else
    update payment_provider_instances
       set status = 'ACTIVE',
           display_name = provider_display_name,
           client_id = provider_client_id,
           config = jsonb_build_object(
             'adapterMode', 'WECHAT_PAY_API_V3',
             'appId', provider_app_id,
             'mchId', provider_mch_id,
             'chargeMode', provider_charge_mode,
             'endpointBaseUrl', provider_endpoint_base_url,
             'apiV3Key', provider_api_v3_key,
             'merchantCertificate', jsonb_build_object(
               'serialNo', merchant_serial_no,
               'privateKeyPem', merchant_private_key_pem,
               'certificatePem', merchant_certificate_pem
             ),
             'platformCertificates', null
           ),
           updated_at = now()
     where id = v_provider_instance_id;
  end if;
end
$$;
