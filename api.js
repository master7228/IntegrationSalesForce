var request = require("request");
var log4js = require('log4js');
var dateFormat = require('dateformat');

var client_id = '3xxx9RHx1QGZ7OsjAQmnxR.dfXXXXXXXXXOPS6_B9JXXXXXXXXXOYd_.g2vnToXXXXXXXC.RyOmCRz3t',
client_secret = '1234567891234567989',
username = 'xxxxx@xxxxx.cl',
password = 'XXXXXYYYYYYYYYXXXXXXXXXXX',
WorkRequest = new Array(),
cont = 0,
contErrorGetWorkRequest = 0,
contErrorAuthentication = 0,
contErrorRequestPut = 0,
statusCase='',
id = 'laura',
key = 'laurakey',
auth='';

log4js.configure({
    appenders: { XXXXX: { type: 'file', filename: 'logs/ApiSalesForce.log' } },
    categories: { default: { appenders: ['XXXXX'], level: 'trace' } }
  });
  
  var logger = log4js.getLogger('XXXXX');

    function Authentication(){
        var headers = {
            'User-Agent':       'Super Agent/0.0.1',
            'Content-Type':     'application/x-www-form-urlencoded'
        }
        var options = {
            url: 'https://test.salesforce.com/services/oauth2/token',
            method: 'POST',
            headers: headers,
            form: {'grant_type': 'password', 
            'client_id': client_id,
            'client_secret': client_secret ,
            'username': username,
            'password': password

            }
        }
        
        request(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body);
                auth = data.token_type+' '+data.access_token;
                contErrorAuthentication = 0;
                RequestPut();
            }else{
                if(contErrorAuthentication<3){
                    contErrorAuthentication++;
                    setTimeout(Authentication, 2000); 
                }else{
                    logger.error('No se pudo obetener el token en la autenticación oauth2 de SalesForce Error -> '+ error);
                }
            }
        })
    }

    function RequestPut(){
        if(auth != ''){
            var identifier = WorkRequest[cont].identifier;
            var idCase = identifier.substr(4);
            var status = "";  
            switch (WorkRequest[cont].requests_x_status_description) {
                case "OPEN_STATUS":
                  status ="Abierta";
                  break;
                case "PROCESS_STATUS":
                  status ="En proceso";
                  break;
                case "OT_IN_PROCESS":
                  status ="OT en Proceso";
                  break;
                case "SOLVED_WITHOUT_OT_STATUS":
                  status ="Resuelta sin OT";
                  break;
                case "CANCEL_STATUS":
                  status ="Cancelada";
                  break;
                case "SOLVED_WITH_OT_STATUS":
                  status ="Resuelta con OT";
                  break;
                case "REQUEST_TODO":
                  status ="En Espera de una OT";
                  break;
                case "OT_IN_REVIEW":
                  status ="OT en Revisión";
                  break;
                case "OT_CANCEL":
                  status ="OT cancelada";
                  break;
                case "AGAIN_REQUEST_TODO":
                  status ="En espera de otra OT";
                  break;
                case "DELETE_TASK_TODO":
                  status ="Solicitud eliminada de Tareas Pendientes";
                  break;
                case "REJECTED":
                  status ="Rechazado";
                  break;
                default:
                    status = "";
              }                     
           request({
                uri: 'https://XXXXXXXXXXXXXXXXXXX--blueclip.cs20.my.salesforce.com/services/apexrest/Cases/',
                method: 'PUT',
                headers:{ Authorization: auth },
                json: {status: status, id:idCase}
            },
        
            function(error, response, body) {
                
                    if(response.statusCode == 200){
                        cont++;
                        if(cont <  WorkRequest.length){
                            RequestPut();
                        }else{
                            logger.info('Proceso de sincronización de casos con solicitudes finalizó');                            
                        }
                    }else if(response.statusCode == 401){
                        if(contErrorRequestPut<3){
                            contErrorRequestPut++;
                            setTimeout(Authentication, 2000); 
                        }else{
                            logger.error('No se pudo realizar la petición PUT por Token Erroneo Error -> 401');
                            cont++;
                            if(cont <  WorkRequest.length){
                                RequestPut();
                            }
                        }
                    }else{
                        if(contErrorRequestPut<3){
                            contErrorRequestPut++;
                            setTimeout(RequestPut, 2000); 
                        }else{
                            logger.error('No se pudo realizar la petición PUT Error -> 500');
                            cont++;
                            if(cont <  WorkRequest.length){
                                RequestPut();
                            }
                        }
                    }  
            })
        }else{
            Authentication();
        }
        
    }

var GetWorkRequest = function () {
    var now = new Date();
    var utc = 4;
    var dateFinal1 = dateFormat(now, "yyyy-mm-dd");
    var dateFinal2 = dateFormat(now, "HH:MM:ss-"+utc);
    var dateFinal = dateFinal1+'T'+dateFinal2;
    now.setMinutes(now.getMinutes()-30);
    var dateInitial1 = dateFormat(now, "yyyy-mm-dd");
    var dateInitial2 = dateFormat(now, "HH:MM:ss-"+utc);
    var dateInitial = dateInitial1+'T'+dateInitial2;
    var requestOptions = {
        uri: 'https://app.XXXXX.com/api/work_requests/?since='+dateInitial+'&until='+dateFinal+'&type_date=date_status',
        method: 'GET',
        headers: {},
        hawk: {
            credentials: {
                id: id,
                key: key,
                algorithm: 'sha256'
            }
        }
    };
    request(requestOptions, function (error, response, body) {
            var result = JSON.parse(body);
            if (!error && result['message'] == 200 ) {
                if(result['data'] != null){
                    var arr = result['data'].map(function (obj) {
                        var reference = obj.identifier;
                        if(reference.indexOf('INT') != -1 ){
                            WorkRequest.push(obj);
                        }
                        
                    });
                    
                    cont = 0;
                    contErrorGetWorkRequest = 0;
                    if(WorkRequest.length != 0){
                        RequestPut();
                    }else{
                        logger.info('No se encontraron solicitudes en el siguietne lapso de tiempo -> '+dateInitial+' - '+dateFinal);
                    }
                }else{
                    logger.info('No se encontraron solicitudes en el siguietne lapso de tiempo -> '+dateInitial+' - '+dateFinal);
                }
                
            }else{

                if(contErrorGetWorkRequest<3){
                    contErrorGetWorkRequest++;
                    setTimeout(GetWorkRequest, 2000); 
                }else{
                    logger.error('No se pudo consumir la api que retorna las WorkRequest con la siguiente url = https://app.XXXXX.com/api/work_requests/since='+dateInitial+'&until='+dateFinal+'&type_date=date_status Error -> '+ error);
                }
            }
        

    });
};

GetWorkRequest();




