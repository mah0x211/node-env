/* (C) Masatoshi Teruya */
"use strict";
var RE_ISARG = new RegExp( 
        '\\s+(' + 
        '-(\\w)(?:\\s+([^-][^\\s]*))?' + 
        '|' + 
        '--(\\w+)(?:=([^\\s]+))?' + 
        ')?', 
        'g'
    );

function makeUsage( opts, cmd )
{
    var idt4 = '    ',
        head = '\nUsage:\n\n    ' + cmd,
        tail = '',
        arg;
    
    opts.forEach(function(opt)
    {
        arg = '-' + opt.abbr;
        tail += '\n' + idt4 + '-' + opt.abbr + ', --' + opt.name + 
                ' : ' + opt.desc;
        
        if( opt.arg ){
            arg += ' ' + opt.arg;
        }
        
        if( opt.required ){
            tail += ' (required)';
            head += ' ' + arg;
        }
        else {
            head += ' [' + arg + ']';
        }
        
        if( opt.def ){
            tail += '\n' + idt4 + '[default] ' + opt.def;
        }
        tail += '\n';
    });
    
    return head + '\n' + tail;
}

function parseArgv()
{
    var args = { __proto__: null },
        argv = process.argv.join(' '),
        remain = argv,
        name;
    
    // parse command line arguments
    while( RE_ISARG.test( argv ) )
    {
        if( ( name = RegExp.$2 ) ){
            args[name] = RegExp.$3;
        }
        else if( ( name = RegExp.$4 ) ){
            args[name] = RegExp.$5;
        }
        
        if( name ){
            remain = remain.replace( RegExp.$1, '' );
        }
    }
    // append plain arguments
    args._ = remain.replace( /(^\s+|\s+|\s+$)/g, ' ' ).split(' ').slice(2);
    
    return args;
}

function mergeArgv( args, opts )
{
    var error = [],
        name,abbr;
    
    // check name and requirement
    opts.forEach(function(opt)
    {
        name = opt.name;
        abbr = opt.abbr;
        if( args[abbr] )
        {
            // same option declare
            if( args[name] ){
                error.push( 'arguments --' + name + ' declaration is duplicated.' );
            }
            else {
                args[name] = args[abbr];
            }
            delete args[abbr];
        }
        // value required
        if( name in args && opt.arg && !args[name] ){
            error.push( 'passed argument --' + name + ' value is undefined' );
        }
        // required option
        else if( opt.required && !args[name] ){
            error.push( 'required argument --' + name + ' is undefined' );
        }
    });
    
    return ( error.length ) ? error : undefined;
}


function Env( opts, cmd )
{
    if( !( this instanceof Env ) ){
        return new Env( opts, cmd );
    }
    
    var argv = undefined,
        error = undefined,
        usage = undefined;
    
    if( arguments.length < 2 || typeof cmd !== 'string' ){
        cmd = process.argv[1].split('/').pop();
    }
    if( arguments.length && opts instanceof Object ){
        opts = JSON.parse( JSON.stringify( opts ) );
    }
    else {
        opts = { __proto__: null };
    }
    
    // create usage
    usage = makeUsage( opts, cmd );
    // parse command line arguments
    argv = parseArgv();
    // manipulate
    error = mergeArgv( argv, opts );
    // freeze
    Object.freeze( argv );
    // create accessor
    this.__defineGetter__('cmd',function(){
        return cmd;
    });
    this.__defineGetter__('usage',function(){
        return usage;
    });
    this.__defineGetter__('argv',function(){
        return argv;
    });
    this.__defineGetter__('error',function(){
        return error;
    });
}

module.exports = Env;
