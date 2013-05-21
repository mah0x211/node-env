/* (C) Masatoshi Teruya */
"use strict";
var RE_PREFIX = new RegExp( /^(-+)/ );

function makeUsage( cmd, opts )
{
    var res = ['Usage:'],
        idt2 = '  ',
        idt4 = '    ',
        usage = [idt2 + cmd],
        desc = [],
        labelMaxLen = 0;
    
    opts.forEach(function(opt)
    {
        var line = {},
            arg = undefined;
        
        if( opt.abbr ){
            line.label = '-' + opt.abbr;
            arg = '-' + opt.abbr;
        }
        if( opt.name ){
            line.label += ', --' + opt.name;
            arg = arg||('--' + opt.name);
        }
        
        if( arg )
        {
            desc.push(line);
            if( line.label.length > labelMaxLen ){
                labelMaxLen = line.label.length;
            }
            
            line.desc = opt.desc||'<no desc>';
            if( opt.def ){
                line.def = '[default] ' + opt.def;
            }
            
            if( opt.arg ){
                line.val = 'VAL=' + opt.arg;
                arg += ' ' + opt.arg;
            }
            
            if( opt.required ){
                line.required = true;
                usage.push( arg );
            }
            else {
                usage.push('[' + arg + ']');
            }
        }
    });
    
    res.push( usage.join(' ') );
    res.push('');
    res.push( 'Options:' );
    desc.forEach(function(item)
    {
        var sp = (new Array(labelMaxLen - item.label.length + 1)).join(' '),
            label = idt2 + item.label + sp + idt4 + ' : ',
            line = [label];
        
        line.push( item.desc );
        if( item.val ){
            line.push( '\n' + (new Array(label.length+1)).join(' ') );
            line.push( item.val );
        }
        if( item.required ){
            line.push( ' (required)' );
        }
        
        if( item.def ){
            line.push( '\n' + (new Array(label.length+1)).join(' ') );
            line.push( item.def );
        }
        res.push( line.join('') );
    });
    res.push('');
    
    return res.join('\n');
}

function parseArgv( opts, err )
{
    var args = { 
            _: [],
            __proto__: null
        },
        argv = process.argv.splice(2),
        accepts = {},
        name,val,opt,keys,attach,prefix;
    
    opts.forEach(function(opt)
    {
        if( opt.name ){
            accepts['--' + opt.name] = opt;
        }
        if( opt.abbr ){
            accepts['-' + opt.abbr] = opt;
        }
    });
    
    // parse command line arguments
    for( var i = 0, argc = argv.length; i < argc; i++ )
    {
        val = argv[i];
        // match option
        if( ( prefix = val.match( RE_PREFIX ) ) )
        {
            attach = undefined;
            if( prefix[1].length > 1 ){
                attach = val.split( '=', 2 );
                name = attach.shift();
            }
            else {
                name = val;
            }
            
            if( ( opt = accepts[name] ) )
            {
                name = opt.name||opt.abbr;
                if( opt.arg )
                {
                    if( attach ){
                        val = attach.shift();
                    }
                    else if( !argv[i+1].match( RE_PREFIX ) ){
                        val = argv[++i];
                    }
                    else {
                        val = undefined;
                    }
                }
                else {
                    val = true;
                }
                
                args[name] = val;
                continue;
            }
        }
        
        // append undefined options and plain arguments
        args._.push( val );
    }
    
    Object.keys( accepts ).forEach(function(key)
    {
        opt = accepts[key];
        if( opt )
        {
            name = opt.name||opt.abbr;
            if( name in args )
            {
                // value required
                if( opt.arg && !args[name] ){
                    err.push( 'passed argument ' + key + ' value is undefined' );
                }
            }
            // required
            else if( opt.required ){
                err.push( 'required argument ' + key + ' is undefined' );
            }
            
            if( opt.abbr ){
                delete accepts['-'+opt.abbr];
            }
            if( opt.name ){
                delete accepts['--'+opt.name];
            }
        }
    });
    
    args._cmd = process.argv[0];
    args._script = process.argv[1];

    return args;
}

function Env( opts, cmd )
{
    var obj = { __proto__: null },
        err = [];
    
    if( arguments.length < 2 || typeof cmd !== 'string' ){
        cmd = process.argv[1].split('/').pop();
    }
    if( arguments.length && opts instanceof Object ){
        opts = JSON.parse( JSON.stringify( opts ) );
    }
    else {
        opts = { __proto__: null };
    }
    
    // append env
    for( var p in process.env ){
        obj[p] = process.env[p];
    }
    // create usage
    obj.usage = makeUsage( cmd, opts );
    // parse command line arguments
    obj.argv = parseArgv( opts, err );
    
    if( err.length ){
        obj.error = err;
    }
    
    Object.freeze( obj.argv._ );
    Object.freeze( obj.argv );
    Object.freeze( obj );
    
    return obj;
}

module.exports = Env;

